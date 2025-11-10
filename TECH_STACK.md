# 后端项目技术选型

## 核心平台

### Cloudflare Workers
- **运行时**: V8 引擎
- **部署**: 全球边缘网络
- **冷启动**: 几乎零冷启动时间

**选型理由**：
- 全球分布式部署，低延迟
- 按请求计费，成本低
- 天然支持 TypeScript
- 与 Cloudflare Pages 无缝集成

## 开发框架

### Hono
- **hono**: ^4.6.0

**选型理由**：
- 轻量级（~13KB），适合 Workers 1MB 限制
- 优秀的 TypeScript 支持
- 中间件生态完善
- 性能优异

**替代方案**：
- itty-router（更轻量，但功能较少）
- Worktop（专为 Workers 设计）

## GraphQL 服务器

### GraphQL Yoga
- **graphql-yoga**: ^5.7.0
- **graphql**: ^16.9.0

**选型理由**：
- 支持 Cloudflare Workers
- 内置 CORS、文件上传等功能
- 完善的插件系统
- 支持订阅（虽然 Workers 不支持 WebSocket）

### Schema 构建
- **@graphql-tools/schema**: ^10.0.0

**用途**：构建 GraphQL Schema

## AI 服务

### OpenAI SDK
- **openai**: ^4.67.0

**功能**：
- 调用 GPT 模型
- 支持流式响应
- 完整的 TypeScript 类型定义

**API 版本**：使用最新的 Chat Completions API

## 数据存储

### Cloudflare KV
- Worker 运行时内置

**用途**：
- 存储对话历史
- 缓存常用响应
- 用户会话管理

**特点**：
- 全球分布式 key-value 存储
- 最终一致性
- 高读取性能

### Cloudflare D1（可选）
- Worker 运行时内置

**用途**：
- 结构化数据存储
- 用户信息管理
- 对话元数据

**特点**：
- SQLite 兼容
- 全球复制
- SQL 查询支持

## 类型定义

### TypeScript
- **typescript**: ^5.6.0
- **@cloudflare/workers-types**: ^4.20240925.0

### GraphQL 类型生成
- **@graphql-codegen/cli**: ^5.0.0
- **@graphql-codegen/typescript**: ^4.0.0
- **@graphql-codegen/typescript-resolvers**: ^4.0.0

**作用**：
- 从 Schema 生成 TypeScript 类型
- 确保 Resolver 类型安全

## 开发工具

### Wrangler
- **wrangler**: ^3.78.0

**作用**：
- Cloudflare Workers 开发 CLI
- 本地开发服务器
- 部署管理
- 日志查看

### 测试
- **vitest**: ^2.0.0
- **@cloudflare/vitest-pool-workers**: ^0.5.0

**选型理由**：
- Vitest 与 Vite 生态一致
- Cloudflare 提供专门的 Workers 测试池

## 请求处理

### CORS
使用 Hono 的 CORS 中间件：
- **hono/cors**: 内置

### 请求验证
- **zod**: ^3.23.0

**用途**：
- 验证 GraphQL 输入
- 环境变量验证
- API 响应验证

## 日志与监控

### 日志
- 使用 Cloudflare Workers 内置 console
- 通过 Wrangler tail 实时查看

### 监控
- Cloudflare Analytics
- Workers Analytics Engine（可选）

## 环境变量管理

### 本地开发
使用 `.dev.vars` 文件：
```
OPENAI_API_KEY=sk-...
```

### 生产环境
使用 Wrangler secrets：
```bash
wrangler secret put OPENAI_API_KEY
```

### 绑定资源
在 `wrangler.toml` 中配置：
```toml
[[kv_namespaces]]
binding = "CHAT_HISTORY"
id = "..."

[[d1_databases]]
binding = "DB"
database_name = "ai-chat"
database_id = "..."
```

## 项目结构建议

```
serverless/
├── src/
│   ├── index.ts              # Worker 入口
│   ├── graphql/
│   │   ├── schema.ts         # GraphQL Schema 定义
│   │   ├── resolvers/        # GraphQL Resolvers
│   │   │   ├── query.ts
│   │   │   └── mutation.ts
│   │   └── types.ts          # 自定义 GraphQL 类型
│   ├── services/
│   │   ├── openai.ts         # OpenAI 服务封装
│   │   ├── history.ts        # 对话历史管理
│   │   └── cache.ts          # 缓存服务
│   ├── middleware/
│   │   ├── auth.ts           # 认证中间件（如需要）
│   │   └── errorHandler.ts  # 错误处理
│   ├── utils/
│   │   ├── validators.ts     # Zod 验证器
│   │   └── helpers.ts        # 辅助函数
│   └── types/
│       ├── env.ts            # 环境变量类型
│       └── context.ts        # GraphQL Context 类型
├── test/
│   └── index.test.ts
├── wrangler.toml             # Cloudflare Workers 配置
├── codegen.ts                # GraphQL Codegen 配置
├── tsconfig.json
└── package.json
```

## GraphQL Schema 设计

### 基础类型
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
```

### Query
```graphql
type Query {
  conversation(id: ID!): Conversation
  conversations(limit: Int, offset: Int): [Conversation!]!
}
```

### Mutation
```graphql
type Mutation {
  sendMessage(conversationId: ID, message: String!): Message!
  createConversation: Conversation!
  deleteConversation(id: ID!): Boolean!
}
```

## OpenAI 集成

### 流式响应
```typescript
const stream = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [...],
  stream: true,
})

// 返回 Server-Sent Events
return streamSSE(stream)
```

### 成本优化
- 使用 `gpt-4o-mini` 作为默认模型（性价比高）
- 限制 max_tokens 避免过长响应
- 实现请求频率限制

## 性能优化

1. **KV 缓存**
   - 缓存常见问题的回复
   - 设置合理的 TTL

2. **请求去重**
   - 使用 Durable Objects（高级场景）
   - 防止重复请求

3. **批量操作**
   - 批量读取 KV 数据
   - 减少 I/O 次数

## 安全最佳实践

1. **API Key 管理**
   - 使用 Workers Secrets 存储
   - 永不暴露在代码中

2. **速率限制**
   - 使用 Cloudflare Rate Limiting
   - 防止滥用

3. **输入验证**
   - 使用 Zod 验证所有输入
   - 防止注入攻击

4. **CORS 配置**
   - 仅允许前端域名
   - 生产环境禁用通配符

## 错误处理

```typescript
import { GraphQLError } from 'graphql'

// 标准化错误响应
throw new GraphQLError('Invalid input', {
  extensions: {
    code: 'BAD_USER_INPUT',
    details: validationErrors,
  },
})
```

## 部署配置

### wrangler.toml
```toml
name = "ai-chat-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[build]
command = "npm run build"

[[kv_namespaces]]
binding = "CHAT_HISTORY"
id = "..."
preview_id = "..."

[vars]
ENVIRONMENT = "production"
```

### 环境变量
- `OPENAI_API_KEY`: OpenAI API 密钥（secret）
- `ALLOWED_ORIGINS`: 允许的 CORS 源（逗号分隔）
- `MAX_TOKENS`: 最大 token 数（默认 1000）

## 开发规范

1. **代码组织**：按功能模块划分目录
2. **类型安全**：所有函数必须有明确的类型定义
3. **错误处理**：统一使用 GraphQLError
4. **日志规范**：使用结构化日志
5. **测试覆盖**：核心逻辑必须有单元测试

## Workers 限制

- CPU 时间: 50ms（免费版）/ 50ms（付费版，可请求延长）
- 内存: 128MB
- 代码大小: 1MB（压缩后）
- 请求大小: 100MB
- KV 读取: 无限制
- KV 写入: 1000/天（免费版）

## 成本估算

### Cloudflare Workers
- 免费额度: 100,000 请求/天
- 付费: $5/月，10M 请求

### OpenAI API
- gpt-4o-mini: $0.15/1M input tokens, $0.60/1M output tokens
- 估算: 1000 次对话 ≈ $0.50 - $2.00（视对话长度）

### Cloudflare KV
- 免费额度: 100,000 读取/天，1,000 写入/天
- 付费: $0.50/月 + 按使用量
