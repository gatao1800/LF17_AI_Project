<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useChatStore } from '@/stores/chat'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const chat = useChatStore()
const { sortedConversations, activeId, isGenerating, settings } = storeToRefs(chat)
const showSettings = ref(false)

function select(id: string): void {
  chat.selectConversation(id)
  emit('close')
}

function startNew(): void {
  chat.newConversation()
  emit('close')
}

function remove(id: string, title: string): void {
  if (confirm(`Chat „${title}“ löschen?`)) chat.deleteConversation(id)
}
</script>

<template>
  <div v-if="open" class="backdrop" @click="emit('close')" />

  <aside class="sidebar" :class="{ open }">
    <div class="brand">Llama-Verdichter</div>

    <button class="new-chat" type="button" :disabled="isGenerating" @click="startNew">
      <span aria-hidden="true">＋</span> Neuer Chat
    </button>

    <nav class="history" aria-label="Chatverlauf">
      <p v-if="sortedConversations.length === 0" class="empty">Noch keine Chats</p>
      <div
        v-for="conversation in sortedConversations"
        :key="conversation.id"
        class="history-item"
        :class="{ active: conversation.id === activeId }"
      >
        <button
          type="button"
          class="history-title"
          :disabled="isGenerating && conversation.id !== activeId"
          :title="conversation.title"
          @click="select(conversation.id)"
        >
          {{ conversation.title }}
        </button>
        <button
          type="button"
          class="history-delete"
          :aria-label="`Chat ${conversation.title} löschen`"
          :disabled="isGenerating && conversation.id === activeId"
          @click="remove(conversation.id, conversation.title)"
        >
          ✕
        </button>
      </div>
    </nav>

    <section class="settings">
      <button
        type="button"
        class="settings-toggle"
        :aria-expanded="showSettings"
        @click="showSettings = !showSettings"
      >
        ⚙ Einstellungen <span aria-hidden="true">{{ showSettings ? '▾' : '▸' }}</span>
      </button>

      <div v-if="showSettings" class="settings-body">
        <label>
          <span>Temperatur: {{ settings.temperature.toFixed(1) }}</span>
          <input v-model.number="settings.temperature" type="range" min="0" max="2" step="0.1" />
        </label>
        <label>
          <span>Max. Tokens</span>
          <input v-model.number="settings.maxTokens" type="number" min="64" max="8192" step="64" />
        </label>
        <label class="checkbox">
          <input v-model="settings.stream" type="checkbox" />
          <span>Antwort live streamen</span>
        </label>
        <label>
          <span>System-Prompt</span>
          <textarea v-model="settings.systemPrompt" rows="6" />
        </label>
        <button type="button" class="reset" @click="chat.resetSettings()">Zurücksetzen</button>
      </div>
    </section>

    <p class="sidebar-note">Created with ❤️ by IGD23</p>
  </aside>
</template>

<style scoped>
.sidebar {
  display: flex;
  width: 260px;
  flex-shrink: 0;
  flex-direction: column;
  gap: 12px;
  padding: 16px 12px;
  overflow-y: auto;
  background: var(--sidebar);
}

.brand {
  padding: 4px 8px 8px;
  font-weight: 700;
}

.new-chat {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.new-chat:hover:not(:disabled) {
  background: var(--hover);
}

.history {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-height: 80px;
  overflow-y: auto;
}

.empty {
  padding: 0 8px;
  color: var(--text-muted);
  font-size: 13px;
}

.history-item {
  display: flex;
  align-items: center;
  border-radius: 8px;
}

.history-item:hover,
.history-item.active {
  background: var(--hover);
}

.history-title {
  flex: 1;
  min-width: 0;
  padding: 8px;
  overflow: hidden;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 14px;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.history-delete {
  padding: 6px 8px;
  border: 0;
  background: transparent;
  color: var(--text-muted);
  font-size: 12px;
  cursor: pointer;
  opacity: 0;
}

.history-item:hover .history-delete,
.history-item.active .history-delete,
.history-delete:focus-visible {
  opacity: 1;
}

.history-delete:hover:not(:disabled) {
  color: var(--danger);
}

.settings {
  border-top: 1px solid var(--border);
  padding-top: 8px;
}

.settings-toggle {
  display: flex;
  justify-content: space-between;
  width: 100%;
  padding: 8px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 14px;
  cursor: pointer;
}

.settings-toggle:hover {
  background: var(--hover);
}

.settings-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px;
  font-size: 13px;
}

.settings-body label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: var(--text-muted);
}

.settings-body label.checkbox {
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.settings-body input[type='number'],
.settings-body textarea {
  padding: 6px 8px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface-2);
  color: var(--text);
  font: inherit;
}

.settings-body textarea {
  resize: vertical;
}

.reset {
  align-self: flex-start;
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted);
  font: inherit;
  cursor: pointer;
}

.sidebar-note {
  margin: 0;
  padding: 0 8px;
  color: var(--text-muted);
  font-size: 12px;
}

.backdrop {
  display: none;
}

@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    inset: 0 auto 0 0;
    z-index: 20;
    transform: translateX(-100%);
    transition: transform 0.2s ease;
  }

  .sidebar.open {
    transform: none;
  }

  .backdrop {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 10;
    background: rgb(0 0 0 / 0.5);
  }
}
</style>
