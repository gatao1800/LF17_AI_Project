<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { plantUmlSvgUrl, renderPlantUmlSvg } from '@/utils/plantuml'

const props = defineProps<{ code: string }>()

const svgUrl = ref('')
const loading = ref(false)
const error = ref('')
const hasSyntaxError = ref(false)
const showCode = ref(false)
const copied = ref(false)

let controller: AbortController | null = null

function revokeSvgUrl(): void {
  if (svgUrl.value) URL.revokeObjectURL(svgUrl.value)
  svgUrl.value = ''
}

async function render(): Promise<void> {
  controller?.abort()
  controller = new AbortController()
  loading.value = true
  error.value = ''

  try {
    const result = await renderPlantUmlSvg(props.code, controller.signal)
    revokeSvgUrl()
    // Als Blob-URL in <img> anzeigen: Skripte im SVG werden so nicht ausgeführt
    svgUrl.value = URL.createObjectURL(new Blob([result.svg], { type: 'image/svg+xml' }))
    hasSyntaxError.value = result.hasSyntaxError
    if (result.hasSyntaxError) showCode.value = true
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') return
    error.value =
      cause instanceof Error ? cause.message : 'Das Diagramm konnte nicht erzeugt werden.'
    showCode.value = true
  } finally {
    loading.value = false
  }
}

async function copyCode(): Promise<void> {
  try {
    await navigator.clipboard.writeText(props.code)
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch {
    // Zwischenablage nicht verfügbar
  }
}

watch(() => props.code, render, { immediate: true })

onBeforeUnmount(() => {
  controller?.abort()
  revokeSvgUrl()
})
</script>

<template>
  <figure class="diagram">
    <div class="toolbar">
      <span class="label">PlantUML</span>
      <div class="actions">
        <button type="button" @click="showCode = !showCode">
          {{ showCode ? 'Code ausblenden' : 'Code anzeigen' }}
        </button>
        <button type="button" @click="copyCode">{{ copied ? 'Kopiert ✓' : 'Code kopieren' }}</button>
        <a v-if="svgUrl" :href="svgUrl" download="diagramm.svg">SVG laden</a>
        <a :href="plantUmlSvgUrl(code)" target="_blank" rel="noopener noreferrer">Öffnen ↗</a>
        <button type="button" :disabled="loading" @click="render">Neu laden</button>
      </div>
    </div>

    <div class="canvas">
      <div v-if="loading && !svgUrl" class="placeholder">Diagramm wird erzeugt …</div>
      <img v-else-if="svgUrl" :src="svgUrl" alt="Generiertes PlantUML-Diagramm" />
      <p v-if="error" class="error">{{ error }}</p>
    </div>

    <p v-if="hasSyntaxError" class="warning">
      Der PlantUML-Code enthält einen Fehler – die Meldung steht im Diagramm.
    </p>

    <pre v-if="showCode" class="code"><code>{{ code }}</code></pre>
  </figure>
</template>

<style scoped>
.diagram {
  margin: 12px 0;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface-2);
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
  font-size: 12px;
}

.label {
  color: var(--text-muted);
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.actions button,
.actions a {
  padding: 4px 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted);
  font: inherit;
  text-decoration: none;
  cursor: pointer;
}

.actions button:hover:not(:disabled),
.actions a:hover {
  background: var(--hover);
  color: var(--text);
}

.canvas {
  display: grid;
  min-height: 80px;
  place-items: center;
  padding: 16px;
  overflow-x: auto;
  background: #fff;
}

.canvas img {
  display: block;
  max-width: 100%;
  height: auto;
}

.placeholder {
  color: #666;
  font-size: 14px;
}

.code {
  margin: 0;
  padding: 12px 16px;
  overflow-x: auto;
  border-top: 1px solid var(--border);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 13px;
  line-height: 1.5;
}

.error {
  margin: 8px 0 0;
  color: #b91c1c;
  font-size: 14px;
}

.warning {
  margin: 0;
  padding: 8px 12px;
  color: var(--warning);
  font-size: 13px;
}
</style>
