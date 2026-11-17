<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import AppSidebar from '@/components/AppSidebar.vue'
import ChatComposer from '@/components/ChatComposer.vue'
import ChatMessage from '@/components/ChatMessage.vue'
import { useChatStore } from '@/stores/chat'

const chat = useChatStore()
const { activeConversation, isGenerating, error, serverStatus } = storeToRefs(chat)

const prompt = ref('')
const sidebarOpen = ref(false)
const chatContainer = ref<HTMLElement | null>(null)
const composer = ref<InstanceType<typeof ChatComposer> | null>(null)
let stickToBottom = true
let statusTimer: ReturnType<typeof setInterval> | undefined

const messages = computed(() => activeConversation.value?.messages ?? [])
const lastAssistantId = computed(() => {
  const last = messages.value[messages.value.length - 1]
  return last?.role === 'assistant' ? last.id : null
})

const statusLabel = computed(
  () =>
    ({
      ok: 'KI bereit',
      loading: 'Modell lädt …',
      offline: 'KI nicht erreichbar',
      unknown: 'Prüfe Verbindung …',
    })[serverStatus.value],
)

const examples = [
  'Erstelle ein Klassendiagramm für ein Bibliothekssystem mit Buch, Leser und Ausleihe.',
  'Zeichne ein Sequenzdiagramm für einen Login mit Passwortprüfung.',
  'Erstelle ein Aktivitätsdiagramm für den Bestellprozess in einem Onlineshop.',
  'Erstelle ein Use-Case-Diagramm für einen Geldautomaten.',
]

function onScroll(): void {
  const element = chatContainer.value
  if (!element) return
  stickToBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 80
}

async function scrollToBottom(force = false): Promise<void> {
  await nextTick()
  const element = chatContainer.value
  if (!element || (!force && !stickToBottom)) return
  element.scrollTo({ top: element.scrollHeight, behavior: force ? 'auto' : 'smooth' })
}

// Während des Streamings mitscrollen, solange der Nutzer unten ist
watch(
  () => [messages.value.length, messages.value[messages.value.length - 1]?.content.length],
  () => scrollToBottom(),
)

watch(
  () => activeConversation.value?.id,
  () => {
    stickToBottom = true
    scrollToBottom(true)
    composer.value?.focus()
  },
)

async function send(text = prompt.value): Promise<void> {
  if (!text.trim() || isGenerating.value) return
  const previous = prompt.value
  prompt.value = ''
  stickToBottom = true
  const sent = await chat.sendMessage(text)
  if (!sent) prompt.value = previous
  composer.value?.focus()
}

onMounted(() => {
  chat.checkServer()
  statusTimer = setInterval(() => chat.checkServer(), 30_000)
  scrollToBottom(true)
  composer.value?.focus()
})

onBeforeUnmount(() => clearInterval(statusTimer))
</script>

<template>
  <div class="app">
    <AppSidebar :open="sidebarOpen" @close="sidebarOpen = false" />

    <main class="main">
      <header class="header">
        <button
          type="button"
          class="menu"
          aria-label="Seitenleiste öffnen"
          @click="sidebarOpen = true"
        >
          ☰
        </button>
        <h2 class="title">{{ activeConversation?.title ?? 'Neues Diagramm' }}</h2>
        <button
          type="button"
          class="status"
          :class="serverStatus"
          title="Verbindung erneut prüfen"
          @click="chat.checkServer()"
        >
          <span class="dot" aria-hidden="true" />
          {{ statusLabel }}
        </button>
      </header>

      <section ref="chatContainer" class="conversation" @scroll.passive="onScroll">
        <div v-if="messages.length === 0" class="welcome">
          <h1>Lass uns ein Diagramm erstellen!</h1>
          <p>Beschreibe dein Diagramm – die KI erzeugt PlantUML-Code und zeigt das Ergebnis direkt an.</p>
          <div class="examples">
            <button
              v-for="example in examples"
              :key="example"
              type="button"
              :disabled="isGenerating"
              @click="send(example)"
            >
              {{ example }}
            </button>
          </div>
        </div>

        <div v-else class="messages">
          <ChatMessage
            v-for="message in messages"
            :key="message.id"
            :message="message"
            :can-regenerate="message.id === lastAssistantId && !isGenerating"
            @regenerate="chat.regenerate()"
          />
        </div>
      </section>

      <div class="composer-area">
        <div v-if="error" class="error" role="alert">
          <span>{{ error }}</span>
          <button type="button" aria-label="Fehlermeldung schließen" @click="error = ''">✕</button>
        </div>

        <ChatComposer
          ref="composer"
          v-model="prompt"
          :is-generating="isGenerating"
          @submit="send()"
          @stop="chat.stopGeneration()"
        />

        <p class="hint">Enter zum Senden · Shift + Enter für eine neue Zeile</p>
      </div>
    </main>
  </div>
</template>

<style scoped>
.app {
  display: flex;
  height: 100dvh;
}

.main {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
}

.header {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 12px 20px;
  border-bottom: 1px solid var(--border);
}

.menu {
  display: none;
  padding: 4px 8px;
  border: 0;
  background: transparent;
  color: inherit;
  font-size: 20px;
  cursor: pointer;
}

.title {
  flex: 1;
  min-width: 0;
  margin: 0;
  overflow: hidden;
  font-size: 16px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status {
  display: inline-flex;
  flex-shrink: 0;
  gap: 6px;
  align-items: center;
  padding: 4px 10px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: transparent;
  color: var(--text-muted);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-muted);
}

.status.ok .dot {
  background: var(--ok);
}

.status.loading .dot {
  background: var(--warning);
}

.status.offline .dot {
  background: var(--danger);
}

.conversation {
  flex: 1;
  overflow-y: auto;
  padding: 24px 20px;
}

.messages,
.composer-area,
.welcome {
  width: min(100%, 820px);
  margin: 0 auto;
}

.welcome {
  display: flex;
  min-height: 100%;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
}

.welcome h1 {
  margin: 0 0 8px;
  font-size: clamp(24px, 4vw, 32px);
}

.welcome p {
  max-width: 520px;
  margin: 0 0 24px;
  color: var(--text-muted);
  line-height: 1.5;
}

.examples {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
  width: 100%;
}

.examples button {
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 14px;
  line-height: 1.4;
  text-align: left;
  cursor: pointer;
}

.examples button:hover:not(:disabled) {
  background: var(--hover);
}

.composer-area {
  padding: 0 20px 14px;
}

.error {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 10px;
  padding: 10px 14px;
  border: 1px solid var(--danger);
  border-radius: 10px;
  color: var(--danger);
  font-size: 14px;
  overflow-wrap: anywhere;
}

.error button {
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.hint {
  margin: 8px 0 0;
  color: var(--text-muted);
  font-size: 12px;
  text-align: center;
}

@media (max-width: 768px) {
  .menu {
    display: block;
  }

  .header {
    padding: 10px 12px;
  }

  .conversation {
    padding: 16px;
  }

  .composer-area {
    padding: 0 12px 12px;
  }

  .hint {
    display: none;
  }
}
</style>
