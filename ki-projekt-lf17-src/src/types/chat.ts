export type ChatRole = 'system' | 'user' | 'assistant'

export type MessageStatus = 'streaming' | 'done' | 'stopped' | 'error'

export interface ChatMessage {
  id: string
  role: Exclude<ChatRole, 'system'>
  content: string
  createdAt: number
  status: MessageStatus
}

export interface Conversation {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
}

export interface ChatSettings {
  systemPrompt: string
  temperature: number
  maxTokens: number
  stream: boolean
}

export type ServerStatus = 'unknown' | 'ok' | 'loading' | 'offline'
