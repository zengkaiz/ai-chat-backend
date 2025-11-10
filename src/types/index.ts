// 环境变量类型
export interface Env {
  OPENAI_API_KEY: string
  ALLOWED_ORIGINS?: string
  DEFAULT_MODEL?: string
  MAX_TOKENS?: string
  CONVERSATIONS?: KVNamespace
}

// 消息角色
export type MessageRole = 'user' | 'assistant' | 'system'

// 消息类型
export interface Message {
  id: string
  role: MessageRole
  content: string
  timestamp: string
}

// 会话类型
export interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: string
  updatedAt: string
}

// GraphQL Context
export interface GraphQLContext {
  env: Env
}

// OpenAI 配置
export interface OpenAIConfig {
  apiKey: string
  model: string
  maxTokens: number
}
