import type { Env, OpenAIConfig } from '../types'

/**
 * 生成唯一 ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 获取当前时间戳
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString()
}

/**
 * 从环境变量获取 OpenAI 配置
 */
export function getOpenAIConfig(env: Env): OpenAIConfig {
  return {
    apiKey: env.OPENAI_API_KEY,
    model: env.DEFAULT_MODEL || 'gpt-4o-mini',
    maxTokens: parseInt(env.MAX_TOKENS || '1000', 10),
  }
}

/**
 * 验证环境变量
 */
export function validateEnv(env: Env): void {
  if (!env.OPENAI_API_KEY) {
    throw new Error('Missing OPENAI_API_KEY environment variable')
  }
}

/**
 * CORS 头部
 */
export function getCorsHeaders(origin: string, env: Env): Record<string, string> {
  const allowedOrigins = env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173']
  const isAllowed = allowedOrigins.includes(origin)

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}
