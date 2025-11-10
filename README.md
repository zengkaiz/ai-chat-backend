# AI Chat Serverless API

基于 Cloudflare Workers + GraphQL + OpenAI 构建的 AI 对话 API 服务。

## 技术栈

查看 [TECH_STACK.md](./TECH_STACK.md) 了解详细的技术选型说明。

核心技术：
- Cloudflare Workers - 边缘计算平台
- Hono - Web 框架
- GraphQL Yoga - GraphQL 服务器
- OpenAI SDK - AI 服务集成
- Cloudflare KV - 数据存储

## 快速开始

### 前置要求

- Node.js >= 18
- npm >= 9
- Cloudflare 账号
- OpenAI API Key

### 安装依赖

```bash
npm install
```

### 环境变量配置

创建 `.dev.vars` 文件（本地开发）：

```env
OPENAI_API_KEY=sk-proj-xxx
ALLOWED_ORIGINS=http://localhost:5173
```

**注意**: `.dev.vars` 已在 `.gitignore` 中，不会被提交到 Git。

### 创建 KV 命名空间

```bash
# 创建生产环境 KV
wrangler kv:namespace create "CHAT_HISTORY"

# 创建预览环境 KV
wrangler kv:namespace create "CHAT_HISTORY" --preview
```

将输出的 ID 填入 `wrangler.toml`：

```toml
[[kv_namespaces]]
binding = "CHAT_HISTORY"
id = "your-namespace-id"
preview_id = "your-preview-namespace-id"
```

### 开发

启动本地开发服务器：

```bash
npm run dev
```

服务将运行在 http://localhost:8787

访问 GraphQL Playground: http://localhost:8787/graphql

### 构建

```bash
npm run build
```

### 部署

#### 首次部署

```bash
# 登录 Cloudflare
wrangler login

# 部署
npm run deploy
```

#### 配置生产环境 Secrets

```bash
wrangler secret put OPENAI_API_KEY
# 输入你的 OpenAI API Key

wrangler secret put ALLOWED_ORIGINS
# 输入允许的前端域名，例如: https://your-app.pages.dev
```

### 测试

```bash
# 运行测试
npm test

# 测试覆盖率
npm run test:coverage
```

## GraphQL API

### Endpoint

- 开发环境: `http://localhost:8787/graphql`
- 生产环境: `https://your-worker.workers.dev/graphql`

### Schema

#### Types

```graphql
type Message {
  id: ID!
  role: Role!
  content: String!
  createdAt: DateTime!
}

enum Role {
  USER
  ASSISTANT
  SYSTEM
}

type Conversation {
  id: ID!
  messages: [Message!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type StreamResponse {
  conversationId: ID!
  messageId: ID!
}
```

#### Queries

```graphql
# 获取单个对话
query GetConversation($id: ID!) {
  conversation(id: $id) {
    id
    messages {
      id
      role
      content
      createdAt
    }
  }
}

# 获取对话列表
query GetConversations($limit: Int, $offset: Int) {
  conversations(limit: $limit, offset: $offset) {
    id
    createdAt
    messages {
      content
    }
  }
}
```

#### Mutations

```graphql
# 发送消息（非流式）
mutation SendMessage($conversationId: ID, $message: String!) {
  sendMessage(conversationId: $conversationId, message: $message) {
    id
    role
    content
    createdAt
  }
}

# 创建新对话
mutation CreateConversation {
  createConversation {
    id
    createdAt
  }
}

# 删除对话
mutation DeleteConversation($id: ID!) {
  deleteConversation(id: $id)
}
```

### 使用示例

#### cURL

```bash
# 发送消息
curl -X POST http://localhost:8787/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { sendMessage(message: \"Hello\") { id content } }"
  }'
```

#### JavaScript/TypeScript

```typescript
const response = await fetch('https://your-worker.workers.dev/graphql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    query: `
      mutation SendMessage($message: String!) {
        sendMessage(message: $message) {
          id
          content
        }
      }
    `,
    variables: {
      message: 'Hello, AI!'
    }
  })
})

const data = await response.json()
```

## 项目结构

```
src/
├── index.ts                  # Worker 入口，路由配置
├── graphql/
│   ├── schema.ts            # GraphQL Schema 定义
│   ├── resolvers/
│   │   ├── query.ts         # Query resolvers
│   │   └── mutation.ts      # Mutation resolvers
│   └── context.ts           # GraphQL Context
├── services/
│   ├── openai.ts            # OpenAI 服务封装
│   ├── history.ts           # 对话历史管理（KV）
│   └── conversation.ts      # 对话逻辑
├── middleware/
│   ├── cors.ts              # CORS 配置
│   └── errorHandler.ts      # 统一错误处理
├── utils/
│   ├── validators.ts        # Zod 验证器
│   └── helpers.ts           # 辅助函数
└── types/
    ├── env.ts               # 环境变量类型
    └── models.ts            # 数据模型类型
```

## 核心功能

### 1. AI 对话

```typescript
// src/services/openai.ts
export async function chat(messages: Message[], env: Env) {
  const openai = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
  })

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: messages.map(m => ({
      role: m.role,
      content: m.content
    })),
    temperature: 0.7,
    max_tokens: 1000,
  })

  return response.choices[0].message
}
```

### 2. 流式响应

```typescript
// 实现 Server-Sent Events
export async function chatStream(messages: Message[], env: Env) {
  const stream = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    stream: true,
  })

  return new Response(
    new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content || ''
          controller.enqueue(new TextEncoder().encode(`data: ${text}\n\n`))
        }
        controller.close()
      }
    }),
    {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    }
  )
}
```

### 3. 对话历史存储

```typescript
// src/services/history.ts
export async function saveConversation(
  conversationId: string,
  conversation: Conversation,
  kv: KVNamespace
) {
  await kv.put(
    `conversation:${conversationId}`,
    JSON.stringify(conversation),
    { expirationTtl: 86400 * 30 } // 30 天过期
  )
}

export async function getConversation(
  conversationId: string,
  kv: KVNamespace
): Promise<Conversation | null> {
  const data = await kv.get(`conversation:${conversationId}`, 'json')
  return data as Conversation | null
}
```

## 配置文件

### wrangler.toml

```toml
name = "ai-chat-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

# KV 命名空间
[[kv_namespaces]]
binding = "CHAT_HISTORY"
id = "your-namespace-id"
preview_id = "your-preview-namespace-id"

# 环境变量（非敏感）
[vars]
ENVIRONMENT = "production"
MAX_TOKENS = "1000"
DEFAULT_MODEL = "gpt-4o-mini"
```

### 环境变量

| 变量名 | 类型 | 说明 | 默认值 |
|--------|------|------|--------|
| `OPENAI_API_KEY` | Secret | OpenAI API 密钥 | 必填 |
| `ALLOWED_ORIGINS` | Secret | 允许的 CORS 源（逗号分隔） | `*` |
| `MAX_TOKENS` | Var | 最大 token 数 | `1000` |
| `DEFAULT_MODEL` | Var | 默认 AI 模型 | `gpt-4o-mini` |

## 监控与日志

### 查看实时日志

```bash
wrangler tail
```

### 查看部署日志

```bash
wrangler deployments list
```

### 监控指标

访问 Cloudflare Dashboard:
- 请求数量
- 错误率
- CPU 使用时间
- KV 操作次数

## 故障排查

### GraphQL 查询失败

1. 检查 Schema 定义是否正确
2. 查看 Resolver 是否抛出异常
3. 使用 `wrangler tail` 查看实时日志

### OpenAI API 错误

```typescript
// 检查 API Key 是否正确配置
wrangler secret list

// 查看 OpenAI 错误信息
console.error('OpenAI Error:', error.message)
```

### CORS 错误

确保 `ALLOWED_ORIGINS` 包含前端域名：

```bash
wrangler secret put ALLOWED_ORIGINS
# 输入: https://your-frontend.pages.dev
```

### KV 数据未保存

1. 检查 KV 命名空间绑定是否正确
2. 确认 KV 写入次数未超过限额
3. 使用 `wrangler kv:key get` 验证数据

```bash
wrangler kv:key get --namespace-id=xxx "conversation:123"
```

## 性能优化

### 1. 缓存策略

```typescript
// 缓存常见问题回复
const cacheKey = `response:${hash(message)}`
const cached = await env.CHAT_HISTORY.get(cacheKey)
if (cached) return JSON.parse(cached)
```

### 2. 请求优化

```typescript
// 限制 max_tokens 减少延迟
max_tokens: Math.min(userInput.length * 3, 1000)
```

### 3. 批量操作

```typescript
// 批量读取对话
const conversations = await Promise.all(
  ids.map(id => getConversation(id, env.CHAT_HISTORY))
)
```

## 安全最佳实践

### 1. API Key 保护

```typescript
// 永远不要硬编码 API Key
const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY, // 从环境变量读取
})
```

### 2. 输入验证

```typescript
import { z } from 'zod'

const MessageInput = z.object({
  message: z.string().min(1).max(2000),
  conversationId: z.string().uuid().optional(),
})

// 在 Resolver 中验证
const input = MessageInput.parse(args)
```

### 3. 速率限制

```typescript
// 使用 Cloudflare Rate Limiting
// 在 wrangler.toml 或 Dashboard 中配置
```

### 4. 错误信息脱敏

```typescript
// 不要暴露内部错误详情
throw new GraphQLError('An error occurred', {
  extensions: { code: 'INTERNAL_SERVER_ERROR' }
})
```

## 成本优化

### Workers 成本
- 使用免费额度: 100,000 请求/天
- 付费计划: $5/月 起

### OpenAI 成本
- 使用 `gpt-4o-mini` 而非 `gpt-4`（成本降低 95%）
- 限制 `max_tokens` 避免过长响应
- 实现缓存减少 API 调用

### KV 成本
- 优化读写次数
- 设置合理的过期时间
- 免费额度通常足够

## License

MIT
