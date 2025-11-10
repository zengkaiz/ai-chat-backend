import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createYoga } from 'graphql-yoga'
import { schema } from './schema'
import type { Env } from './types'
import { validateEnv, getCorsHeaders } from './utils'

const app = new Hono<{ Bindings: Env }>()

// CORS 中间件
app.use('/*', async (c, next) => {
  const origin = c.req.header('Origin') || 'http://localhost:5173'
  const corsHeaders = getCorsHeaders(origin, c.env)

  // 处理 OPTIONS 请求
  if (c.req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  await next()

  // 添加 CORS 头部到响应
  Object.entries(corsHeaders).forEach(([key, value]) => {
    c.res.headers.set(key, value)
  })
})

// 创建 GraphQL Yoga 实例
app.all('/graphql', async (c) => {
  // 验证环境变量
  try {
    validateEnv(c.env)
  } catch (error) {
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    )
  }

  const yoga = createYoga({
    schema,
    context: {
      env: c.env,
    },
    graphqlEndpoint: '/graphql',
    landingPage: false,
  })

  return yoga(c.req.raw, {})
})

// 健康检查端点
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  })
})

// 根路径
app.get('/', (c) => {
  return c.json({
    message: 'AI Chat Serverless API',
    endpoints: {
      graphql: '/graphql',
      health: '/health',
    },
  })
})

export default app
