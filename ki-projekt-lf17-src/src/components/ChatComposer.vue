<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'

const text = defineModel<string>({ required: true })

defineProps<{ isGenerating: boolean }>()

const emit = defineEmits<{ submit: []; stop: [] }>()

const textarea = ref<HTMLTextAreaElement | null>(null)

function autoResize(): void {
  const element = textarea.value
  if (!element) return
  element.style.height = 'auto'
  element.style.height = `${Math.min(element.scrollHeight, 220)}px`
}

watch(text, () => nextTick(autoResize))

function focus(): void {
  textarea.value?.focus()
}

defineExpose({ focus })
</script>

<template>
  <form class="composer" @submit.prevent="emit('submit')">
    <textarea
      ref="textarea"
      v-model="text"
      rows="1"
      placeholder="Beschreibe das Diagramm, das du brauchst …"
      aria-label="Nachricht"
      @keydown.enter.exact.prevent="emit('submit')"
    />
    <button
      v-if="isGenerating"
      type="button"
      class="send stop"
      aria-label="Antwort stoppen"
      @click="emit('stop')"
    >
      ■ Stopp
    </button>
    <button v-else type="submit" class="send" :disabled="!text.trim()">Senden</button>
  </form>
</template>

<style scoped>
.composer {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  padding: 10px 10px 10px 16px;
  border: 1px solid var(--border);
  border-radius: 18px;
  background: var(--surface-2);
  transition: border-color 0.15s;
}

.composer:focus-within {
  border-color: var(--text-muted);
}

textarea {
  flex: 1;
  min-height: 24px;
  max-height: 220px;
  padding: 8px 0;
  resize: none;
  border: 0;
  outline: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  line-height: 1.5;
}

.send {
  flex-shrink: 0;
  padding: 10px 16px;
  border: 0;
  border-radius: 12px;
  background: var(--text);
  color: var(--bg);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.send.stop {
  background: var(--surface-3);
  color: var(--text);
}

.send:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
