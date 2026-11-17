import { encode } from 'plantuml-encoder'
import { PLANTUML_SERVER_URL } from '@/config'

export type ContentSegment =
  | { type: 'text'; content: string }
  | { type: 'plantuml'; code: string }
  | { type: 'plantuml-pending' }

/**
 * Findet `@startuml … @enduml`-Blöcke. Ein umschließender Markdown-Codeblock
 * (```plantuml … ```) wird mit entfernt, damit er nicht als Text stehen bleibt.
 */
const PLANTUML_BLOCK =
  /(?:```[\w-]*[ \t]*\r?\n)?[ \t]*(@startuml\b[\s\S]*?@enduml)[ \t]*(?:\r?\n[ \t]*```)?/g

/** Gibt alle vollständigen PlantUML-Blöcke aus einer KI-Antwort zurück. */
export function extractPlantUml(text: string): string[] {
  return Array.from(text.matchAll(PLANTUML_BLOCK), (match) => match[1] ?? '').filter(Boolean)
}

/**
 * Zerlegt eine Antwort in Text- und Diagramm-Abschnitte (in Originalreihenfolge).
 * Ein begonnener, aber noch nicht beendeter Block (z. B. beim Streaming) wird als
 * `plantuml-pending` markiert.
 */
export function splitContent(text: string): ContentSegment[] {
  const segments: ContentSegment[] = []
  let lastIndex = 0

  const pushText = (value: string): void => {
    const trimmed = value.trim()
    if (trimmed) segments.push({ type: 'text', content: trimmed })
  }

  for (const match of text.matchAll(PLANTUML_BLOCK)) {
    pushText(text.slice(lastIndex, match.index))
    segments.push({ type: 'plantuml', code: match[1] ?? '' })
    lastIndex = match.index + match[0].length
  }

  const rest = text.slice(lastIndex)
  const openIndex = rest.search(/(?:```[\w-]*[ \t]*\r?\n)?[ \t]*@startuml\b/)
  if (openIndex === -1) {
    pushText(rest)
  } else {
    pushText(rest.slice(0, openIndex))
    segments.push({ type: 'plantuml-pending' })
  }

  return segments
}

/** URL, unter der der PlantUML-Server das Diagramm als SVG ausliefert. */
export function plantUmlSvgUrl(code: string): string {
  return `${PLANTUML_SERVER_URL}/svg/${encode(code)}`
}

export interface RenderedSvg {
  svg: string
  /** true, wenn der Server einen Syntaxfehler gemeldet hat (SVG zeigt dann die Fehlermeldung). */
  hasSyntaxError: boolean
}

/** Wandelt PlantUML-Code über den PlantUML-Server in SVG-Markup um. */
export async function renderPlantUmlSvg(code: string, signal?: AbortSignal): Promise<RenderedSvg> {
  const response = await fetch(plantUmlSvgUrl(code), { signal })
  const svg = await response.text()

  if (!svg.includes('<svg')) {
    throw new Error(`PlantUML-Server antwortete mit Status ${response.status}.`)
  }
  return { svg, hasSyntaxError: !response.ok }
}
