<script setup lang="ts">
import { computed, ref } from 'vue'
import PlantUmlDiagram from './PlantUmlDiagram.vue'
import { splitContent, type ContentSegment } from '@/utils/plantuml'
import type { ChatMessage } from '@/types/chat'

const props = defineProps<{
  message: ChatMessage
  canRegenerate: boolean
}>()

const emit = defineEmits<{ regenerate: [] }>()

const copied = ref(false)
const isUser = computed(() => props.message.role === 'user')
// Nutzernachrichten unverändert anzeigen, KI-Antworten in Text + Diagramme zerlegen
const segments = computed<ContentSegment[]>(() =>
  isUser.value
    ? [{ type: 'text', content: props.message.content }]
    : splitContent(props.message.content),
)
const time = computed(() =>
  new Date(props.message.createdAt).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  }),
)

async function copyMessage(): Promise<void> {
  try {
    await navigator.clipboard.writeText(props.message.content)
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch {
    // Zwischenablage nicht verfügbar
  }
}
</script>

<template>
  <article class="message" :class="message.role">
    <div class="avatar" aria-hidden="true">{{ isUser ? 'Du' : 'KI' }}</div>

    <div class="body">
      <header class="meta">
        <strong>{{ isUser ? 'Du' : 'Assistent' }}</strong>
        <time>{{ time }}</time>
      </header>

      <div class="content">
        <template v-for="(segment, index) in segments" :key="index">
          <p v-if="segment.type === 'text'" class="text">{{ segment.content }}</p>
          <PlantUmlDiagram v-else-if="segment.type === 'plantuml'" :code="segment.code" />
          <div v-else class="pending">Diagramm wird geschrieben …</div>
        </template>

        <span
          v-if="message.status === 'streaming' && !message.content"
          class="typing"
          aria-label="KI antwortet"
        >
          <i /><i /><i />
        </span>
      </div>

      <p v-if="message.status === 'stopped'" class="status">Antwort abgebrochen</p>
      <p v-else-if="message.status === 'error'" class="status error">Antwort unvollständig</p>

      <div v-if="message.status !== 'streaming'" class="actions">
        <button type="button" @click="copyMessage">{{ copied ? 'Kopiert ✓' : 'Kopieren' }}</button>
        <button v-if="canRegenerate" type="button" @click="emit('regenerate')">Neu generieren</button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.message {
  display: flex;
  gap: 14px;
  margin-bottom: 28px;
}

.avatar {
  display: grid;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  place-items: center;
  border-radius: 50%;
  background: var(--surface-3);
  font-size: 12px;
  font-weight: 700;
}

.assistant .avatar {
  background: var(--accent);
  color: #fff;
}

.body {
  flex: 1;
  min-width: 0;
}

.user .body {
  max-width: 85%;
}

.meta {
  display: flex;
  gap: 8px;
  align-items: baseline;
  margin-bottom: 4px;
}

.meta time {
  color: var(--text-muted);
  font-size: 12px;
}

.user .content {
  display: inline-block;
  padding: 10px 14px;
  border-radius: 14px;
  background: var(--surface-2);
}

.text {
  margin: 0 0 8px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.6;
}

.text:last-child {
  margin-bottom: 0;
}

.pending {
  margin: 12px 0;
  padding: 24px;
  border: 1px dashed var(--border);
  border-radius: 12px;
  color: var(--text-muted);
  font-size: 14px;
  text-align: center;
}

.typing {
  display: inline-flex;
  gap: 4px;
  padding: 8px 0;
}

.typing i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--text-muted);
  animation: blink 1.2s infinite ease-in-out;
}

.typing i:nth-child(2) {
  animation-delay: 0.15s;
}

.typing i:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes blink {
  0%,
  80%,
  100% {
    opacity: 0.25;
  }
  40% {
    opacity: 1;
  }
}

.status {
  margin: 6px 0 0;
  color: var(--text-muted);
  font-size: 12px;
  font-style: italic;
}

.status.error {
  color: var(--danger);
}

.actions {
  display: flex;
  gap: 4px;
  margin-top: 6px;
  opacity: 0;
  transition: opacity 0.15s;
}

.message:hover .actions,
.message:focus-within .actions {
  opacity: 1;
}

@media (hover: none) {
  .actions {
    opacity: 1;
  }
}

.actions button {
  padding: 4px 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.actions button:hover {
  background: var(--hover);
  color: var(--text);
}
</style>
