/**
 * Zentrale Konfiguration. Werte können über eine `.env.local` überschrieben werden
 * (siehe `.env.example`).
 */

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

/**
 * Basis-URL des llama.cpp-Servers (`llama-server`).
 * Leer = relative Pfade (`/v1/...`, `/health`), die im Dev-Modus über den Vite-Proxy laufen.
 */
export const LLAMA_API_BASE_URL = trimTrailingSlash(import.meta.env.VITE_LLAMA_API_URL ?? '')

/** PlantUML-Server, der den Diagramm-Code in SVG umwandelt. */
export const PLANTUML_SERVER_URL = trimTrailingSlash(
  import.meta.env.VITE_PLANTUML_SERVER_URL || 'https://www.plantuml.com/plantuml',
)

export const DEFAULT_SYSTEM_PROMPT = `Du bist ein hilfreicher Assistent, der Diagramme mit PlantUML erstellt.
Antworte auf Deutsch. Wenn der Nutzer ein Diagramm möchte, gib den vollständigen PlantUML-Code
zwischen @startuml und @enduml aus. Erkläre das Diagramm danach in wenigen Sätzen.`

export const DEFAULT_TEMPERATURE = 0.7
export const DEFAULT_MAX_TOKENS = 1024
