import { computed, reactive, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import {
  getResponse,
  getServerStatus,
  postPrompt,
  streamResponse,
  type ApiChatMessage,
} from '@/composables/api-calls'
import { DEFAULT_MAX_TOKENS, DEFAULT_SYSTEM_PROMPT, DEFAULT_TEMPERATURE } from '@/config'
import type { ChatMessage, ChatSettings, Conversation, ServerStatus } from '@/types/chat'

const STORAGE_KEY = 'llama-verdichter:v1'

function createId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function defaultSettings(): ChatSettings {
  return {
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    temperature: DEFAULT_TEMPERATURE,
    maxTokens: DEFAULT_MAX_TOKENS,
    stream: true,
  }
}

interface PersistedState {
  conversations: Conversation[]
  activeId: string | null
  settings: ChatSettings
}

function loadState(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as PersistedState) : null
  } catch {
    return null
  }
}

function makeTitle(text: string): string {
  const singleLine = text.replace(/\s+/g, ' ').trim()
  return singleLine.length > 40 ? `${singleLine.slice(0, 40)}…` : singleLine || 'Neuer Chat'
}

export const useChatStore = defineStore('chat', () => {
  const saved = loadState()

  const conversations = ref<Conversation[]>(
    // Unterbrochene Antworten aus einer vorherigen Sitzung als gestoppt markieren
    (saved?.conversations ?? []).map((conversation) => ({
      ...conversation,
      messages: conversation.messages.map((message) =>
        message.status === 'streaming' ? { ...message, status: 'stopped' as const } : message,
      ),
    })),
  )
  const activeId = ref<string | null>(saved?.activeId ?? null)
  const settings = reactive<ChatSettings>({ ...defaultSettings(), ...saved?.settings })
  const isGenerating = ref(false)
  const error = ref('')
  const serverStatus = ref<ServerStatus>('unknown')

  let controller: AbortController | null = null

  const activeConversation = computed(
    () => conversations.value.find((conversation) => conversation.id === activeId.value) ?? null,
  )

  const sortedConversations = computed(() =>
    [...conversations.value].sort((a, b) => b.updatedAt - a.updatedAt),
  )

  watch(
    [conversations, activeId, settings],
    () => {
      try {
        const state: PersistedState = {
          conversations: conversations.value,
          activeId: activeId.value,
          settings: { ...settings },
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      } catch {
        // Speicher nicht verfügbar (z. B. privater Modus) – Chat funktioniert trotzdem
      }
    },
    { deep: true },
  )

  function newConversation(): void {
    if (isGenerating.value) return
    activeId.value = null
    error.value = ''
  }

  function selectConversation(id: string): void {
    if (isGenerating.value) return
    activeId.value = id
    error.value = ''
  }

  function deleteConversation(id: string): void {
    if (isGenerating.value && id === activeId.value) return
    conversations.value = conversations.value.filter((conversation) => conversation.id !== id)
    if (activeId.value === id) activeId.value = null
  }

  function resetSettings(): void {
    Object.assign(settings, defaultSettings())
  }

  function buildApiMessages(messages: ChatMessage[]): ApiChatMessage[] {
    const history: ApiChatMessage[] = messages
      .filter((message) => message.status !== 'error' && message.content.trim())
      .map(({ role, content }) => ({ role, content }))

    const systemPrompt = settings.systemPrompt.trim()
    return systemPrompt ? [{ role: 'system', content: systemPrompt }, ...history] : history
  }

  /** Erzeugt eine KI-Antwort auf den aktuellen Verlauf der Unterhaltung. */
  async function generateReply(conversation: Conversation): Promise<void> {
    const apiMessages = buildApiMessages(conversation.messages)

    conversation.messages.push({
      id: createId(),
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
      status: 'streaming',
    })
    // Über das reaktive Array zugreifen, damit Änderungen in der UI ankommen
    const reply = conversation.messages[conversation.messages.length - 1]!

    isGenerating.value = true
    error.value = ''
    controller = new AbortController()

    try {
      const response = await postPrompt(apiMessages, {
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
        stream: settings.stream,
        signal: controller.signal,
      })

      if (settings.stream) {
        for await (const chunk of streamResponse(response)) {
          reply.content += chunk
        }
      } else {
        reply.content = await getResponse(response)
      }
      reply.status = 'done'
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') {
        reply.status = 'stopped'
      } else {
        reply.status = 'error'
        error.value = cause instanceof Error ? cause.message : 'Unbekannter Fehler'
        if (!reply.content) {
          conversation.messages.splice(conversation.messages.indexOf(reply), 1)
        }
      }
    } finally {
      conversation.updatedAt = Date.now()
      isGenerating.value = false
      controller = null
    }
  }

  async function sendMessage(text: string): Promise<boolean> {
    const content = text.trim()
    if (!content || isGenerating.value) return false

    if (!activeConversation.value) {
      const now = Date.now()
      conversations.value.push({
        id: createId(),
        title: makeTitle(content),
        messages: [],
        createdAt: now,
        updatedAt: now,
      })
      activeId.value = conversations.value[conversations.value.length - 1]!.id
    }

    const conversation = activeConversation.value!
    conversation.messages.push({
      id: createId(),
      role: 'user',
      content,
      createdAt: Date.now(),
      status: 'done',
    })

    await generateReply(conversation)
    return true
  }

  /** Verwirft die letzte KI-Antwort und lässt sie neu erzeugen. */
  async function regenerate(): Promise<void> {
    const conversation = activeConversation.value
    if (!conversation || isGenerating.value) return

    const last = conversation.messages[conversation.messages.length - 1]
    if (last?.role === 'assistant') conversation.messages.pop()
    if (conversation.messages.length === 0) return

    await generateReply(conversation)
  }

  function stopGeneration(): void {
    controller?.abort()
  }

  async function checkServer(): Promise<void> {
    serverStatus.value = await getServerStatus()
  }

  return {
    conversations,
    sortedConversations,
    activeId,
    activeConversation,
    settings,
    isGenerating,
    error,
    serverStatus,
    newConversation,
    selectConversation,
    deleteConversation,
    resetSettings,
    sendMessage,
    regenerate,
    stopGeneration,
    checkServer,
  }
})
