/**
 * API-Schicht für llama.cpp (`llama-server`, OpenAI-kompatible Endpunkte).
 *
 * Die konkrete Schnittstelle ist noch nicht final – Pfade und Basis-URL werden
 * daher zentral hier bzw. in `src/config.ts` gepflegt.
 */
import { DEFAULT_MAX_TOKENS, DEFAULT_TEMPERATURE, LLAMA_API_BASE_URL } from '@/config'
import type { ChatRole, ServerStatus } from '@/types/chat'

export const ENDPOINTS = {
  chatCompletions: `${LLAMA_API_BASE_URL}/v1/chat/completions`,
  models: `${LLAMA_API_BASE_URL}/v1/models`,
  health: `${LLAMA_API_BASE_URL}/health`,
} as const

export interface ApiChatMessage {
  role: ChatRole
  content: string
}

export interface PromptOptions {
  temperature?: number
  maxTokens?: number
  stream?: boolean
  signal?: AbortSignal
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: unknown } }>
}

interface ChatCompletionChunk {
  choices?: Array<{ delta?: { content?: string | null } }>
}

interface ModelsResponse {
  data?: Array<{ id?: unknown }>
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function ensureOk(response: Response): Promise<void> {
  if (response.ok) return
  const body = await response.text().catch(() => '')
  throw new ApiError(`Serverfehler ${response.status}${body ? `: ${body}` : ''}`, response.status)
}

/**
 * Sendet einen Prompt (inkl. Verlauf) an die KI. Gibt die rohe `Response` zurück,
 * die mit `getResponse` (komplett) oder `streamResponse` (Stück für Stück) gelesen wird.
 * Ein einzelner String wird als einzelne Nutzernachricht gesendet.
 */
export async function postPrompt(
  prompt: string | ApiChatMessage[],
  options: PromptOptions = {},
): Promise<Response> {
  const messages: ApiChatMessage[] =
    typeof prompt === 'string' ? [{ role: 'user', content: prompt }] : prompt

  try {
    return await fetch(ENDPOINTS.chatCompletions, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: options.signal,
      body: JSON.stringify({
        messages,
        temperature: options.temperature ?? DEFAULT_TEMPERATURE,
        max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
        stream: options.stream ?? false,
      }),
    })
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause
    throw new ApiError('Der KI-Server ist nicht erreichbar. Läuft llama.cpp?')
  }
}

/** Liest eine nicht gestreamte Antwort und gibt den Antworttext zurück. */
export async function getResponse(response: Response): Promise<string> {
  await ensureOk(response)
  const data = (await response.json()) as ChatCompletionResponse
  const content = data.choices?.[0]?.message?.content

  if (typeof content !== 'string') {
    throw new ApiError('Die Serverantwort enthält keinen Antworttext.')
  }
  return content
}

/** Liest eine gestreamte Antwort (Server-Sent Events) und liefert die Text-Stücke. */
export async function* streamResponse(response: Response): AsyncGenerator<string> {
  await ensureOk(response)
  if (!response.body) throw new ApiError('Die Serverantwort enthält keine Daten.')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const rawLine of lines) {
        const line = rawLine.trim()
        if (!line.startsWith('data:')) continue

        const payload = line.slice(5).trim()
        if (payload === '[DONE]') return

        const chunk = JSON.parse(payload) as ChatCompletionChunk
        const text = chunk.choices?.[0]?.delta?.content
        if (text) yield text
      }
    }
  } finally {
    reader.releaseLock()
  }
}

/** Komfortfunktion: Prompt senden und vollständige Antwort zurückgeben. */
export async function sendPrompt(
  prompt: string | ApiChatMessage[],
  options: Omit<PromptOptions, 'stream'> = {},
): Promise<string> {
  const response = await postPrompt(prompt, { ...options, stream: false })
  return getResponse(response)
}

/** Fragt den Status des llama.cpp-Servers ab (`GET /health`). */
export async function getServerStatus(signal?: AbortSignal): Promise<ServerStatus> {
  try {
    const response = await fetch(ENDPOINTS.health, { signal })
    if (response.ok) return 'ok'
    if (response.status === 503) return 'loading'
    return 'offline'
  } catch {
    return 'offline'
  }
}

/** Liefert die auf dem Server geladenen Modelle (`GET /v1/models`). */
export async function getModels(signal?: AbortSignal): Promise<string[]> {
  const response = await fetch(ENDPOINTS.models, { signal })
  await ensureOk(response)
  const data = (await response.json()) as ModelsResponse
  return (data.data ?? [])
    .map((model) => model.id)
    .filter((id): id is string => typeof id === 'string')
}
