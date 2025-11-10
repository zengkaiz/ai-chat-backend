# 后端部署指南 - Cloudflare Workers

本指南将帮助你将 AI 聊天助手后端 API 部署到 Cloudflare Workers。

## 📋 前置要求

- Cloudflare 账户 (免费账户即可)
- OpenAI API Key (需要有可用余额)
- Node.js 18+ 已安装
- Wrangler CLI 已安装

## 🔧 准备工作

### 1. 安装 Wrangler CLI

```bash
npm install -g wrangler
```

### 2. 登录 Cloudflare

```bash
wrangler login
```

这会打开浏览器窗口，完成 OAuth 授权。

### 3. 验证登录状态

```bash
wrangler whoami
```

## 🚀 部署步骤

### 步骤 1: 配置项目

#### 检查 wrangler.toml

确认 `wrangler.toml` 配置正确：

```toml
name = "ai-chat-serverless"
main = "src/index.ts"
compatibility_date = "2024-11-01"

[dev]
port = 8787

[vars]
ALLOWED_ORIGINS = "https://ai-chat-frontend.pages.dev"
```

**重要**：将 `ALLOWED_ORIGINS` 改为你的前端 Pages URL。

#### 更新项目名称（可选）

如果想自定义 Worker 名称，修改 `name` 字段：

```toml
name = "my-ai-chat-api"
```

这将决定你的 Worker URL：`https://my-ai-chat-api.workers.dev`

### 步骤 2: 设置环境变量（Secrets）

Workers 的敏感信息（如 API Key）需要通过 Secret 管理，不能写在 `wrangler.toml` 中。

#### 设置 OpenAI API Key

```bash
wrangler secret put OPENAI_API_KEY
```

系统会提示你输入密钥，粘贴你的 OpenAI API Key：
```
sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### 设置其他环境变量（可选）

```bash
# 设置默认模型
wrangler secret put DEFAULT_MODEL
# 输入: gpt-4o-mini

# 设置最大 Token 数
wrangler secret put MAX_TOKENS
# 输入: 1000
```

**注意**：`ALLOWED_ORIGINS` 不是 Secret，已在 `wrangler.toml` 的 `[vars]` 中配置。

### 步骤 3: 部署到 Workers

#### 首次部署

```bash
# 确保在 serverless 目录
cd serverless

# 部署
wrangler deploy
```

部署过程：
1. 编译 TypeScript 代码
2. 打包依赖
3. 上传到 Cloudflare Workers
4. 部署到全球边缘网络

#### 查看部署结果

部署成功后，你会看到：

```
 ⛅️ wrangler 3.114.15
-------------------
Your worker has access to the following bindings:
- Vars:
  - ALLOWED_ORIGINS: "https://ai-chat-frontend.pages.dev"
- Secrets:
  - OPENAI_API_KEY

Published ai-chat-serverless (0.01 sec)
  https://ai-chat-serverless.workers.dev
```

你的 Worker URL 就是：**`https://ai-chat-serverless.workers.dev`**

GraphQL 端点：**`https://ai-chat-serverless.workers.dev/graphql`**

### 步骤 4: 测试部署

#### 测试健康检查

```bash
curl https://ai-chat-serverless.workers.dev/health
```

期望输出：
```json
{
  "status": "ok",
  "timestamp": "2025-11-08T10:00:00.000Z"
}
```

#### 测试 GraphQL API

```bash
curl -X POST https://ai-chat-serverless.workers.dev/graphql \
  -H "Content-Type: application/json" \
  -H "Origin: https://ai-chat-frontend.pages.dev" \
  -d '{
    "query": "mutation { createConversation(title: \"测试\") { id title } }"
  }'
```

#### 测试 OpenAI 集成

```bash
curl -X POST https://ai-chat-serverless.workers.dev/graphql \
  -H "Content-Type: application/json" \
  -H "Origin: https://ai-chat-frontend.pages.dev" \
  -d '{
    "query": "mutation { createConversation(title: \"测试\") { id } }"
  }' | jq -r '.data.createConversation.id' | \
xargs -I {} curl -X POST https://ai-chat-serverless.workers.dev/graphql \
  -H "Content-Type: application/json" \
  -H "Origin: https://ai-chat-frontend.pages.dev" \
  -d "{
    \"query\": \"mutation { sendMessage(conversationId: \\\"{}\\\", message: \\\"你好\\\") { content } }\"
  }"
```

### 步骤 5: 更新前端配置

部署成功后，需要更新前端的 API 地址：

1. 进入 Cloudflare Pages Dashboard
2. 选择前端项目 `ai-chat-frontend`
3. 进入 **Settings** → **Environment variables**
4. 编辑 `VITE_GRAPHQL_ENDPOINT`
5. 将值改为：`https://ai-chat-serverless.workers.dev/graphql`
6. 保存并重新部署前端

### 步骤 6: 更新 CORS 配置

确保后端允许前端域名访问。编辑 `wrangler.toml`：

```toml
[vars]
ALLOWED_ORIGINS = "https://ai-chat-frontend.pages.dev,https://your-custom-domain.com"
```

如果有多个域名，用逗号分隔。然后重新部署：

```bash
wrangler deploy
```

## 🔄 更新部署

修改代码后重新部署：

```bash
# 1. 提交代码（可选）
git add .
git commit -m "Update API logic"

# 2. 部署
wrangler deploy
```

Workers 支持即时部署，通常在 10 秒内生效。

## 📊 查看日志和监控

### 实时日志

```bash
wrangler tail
```

这会显示所有请求的实时日志，包括：
- 请求路径和方法
- 响应状态码
- 错误信息
- console.log 输出

### 查看指标

```bash
wrangler metrics
```

或在 Cloudflare Dashboard 查看：
1. 进入 **Workers & Pages**
2. 选择你的 Worker
3. 点击 **Metrics** 标签

可以看到：
- 请求数量
- 错误率
- CPU 时间
- 请求延迟

## 🔒 安全配置

### 1. 保护 Secret

**重要**：永远不要将 API Key 写入代码或 `wrangler.toml`。

查看已设置的 Secret：

```bash
wrangler secret list
```

删除 Secret：

```bash
wrangler secret delete OPENAI_API_KEY
```

### 2. 限制请求来源

确保 CORS 配置只允许你的前端域名：

```toml
[vars]
ALLOWED_ORIGINS = "https://ai-chat-frontend.pages.dev"
```

### 3. 速率限制（可选）

如果需要防止滥用，可以使用 Cloudflare Rate Limiting：

在 `src/index.ts` 中添加中间件：

```typescript
// 简单的速率限制示例（基于 IP）
app.use(async (c, next) => {
  const ip = c.req.header('CF-Connecting-IP')
  // 实现速率限制逻辑
  await next()
})
```

## 💰 成本估算

### Workers 定价

**免费额度**（Free Plan）：
- 100,000 请求/天
- 10 毫秒 CPU 时间/请求
- 对于小型应用已足够

**付费计划**（$5/月）：
- 10,000,000 请求/月
- 50 毫秒 CPU 时间/请求
- 额外请求 $0.50/百万

### OpenAI API 成本

使用 `gpt-4o-mini`：
- 输入：$0.15 / 1M tokens
- 输出：$0.60 / 1M tokens

预估成本（个人使用）：
- 每天 100 次对话
- 平均每次对话 500 tokens
- 月成本：约 $1-3

## 🛠️ 高级配置

### 配置 KV 存储（可选）

如果需要持久化存储会话数据：

#### 1. 创建 KV 命名空间

```bash
# 生产环境
wrangler kv:namespace create "CONVERSATIONS"

# 预览环境
wrangler kv:namespace create "CONVERSATIONS" --preview
```

#### 2. 更新 wrangler.toml

```toml
[[kv_namespaces]]
binding = "CONVERSATIONS"
id = "your-kv-namespace-id"
preview_id = "your-preview-kv-namespace-id"
```

#### 3. 更新代码使用 KV

在 `src/resolvers/index.ts` 中使用 KV 替代内存 Map。

### 配置 D1 数据库（可选）

如果需要关系型数据库：

```bash
# 创建 D1 数据库
wrangler d1 create ai-chat-db

# 更新 wrangler.toml
[[d1_databases]]
binding = "DB"
database_name = "ai-chat-db"
database_id = "your-database-id"
```

### 配置多环境

创建 `wrangler.dev.toml` 用于开发环境：

```toml
name = "ai-chat-serverless-dev"
# ... 其他配置

[vars]
ALLOWED_ORIGINS = "http://localhost:5173"
```

部署到开发环境：

```bash
wrangler deploy --config wrangler.dev.toml
```

## 🔍 故障排查

### 1. 部署失败

**错误**：`Authentication error`

**解决**：
```bash
wrangler login
```

**错误**：`Upload failed`

**解决**：
- 检查网络连接
- 确认文件大小未超过 1MB（Workers 限制）
- 检查代码是否有语法错误

### 2. OpenAI API 调用失败

**错误**：`OPENAI_API_KEY is not defined`

**解决**：
```bash
wrangler secret put OPENAI_API_KEY
```

**错误**：`Rate limit exceeded`

**解决**：
- 检查 OpenAI 账户余额
- 降低请求频率
- 使用更便宜的模型

### 3. CORS 错误

**错误**：`Access-Control-Allow-Origin` 头部缺失

**解决**：
1. 检查 `ALLOWED_ORIGINS` 配置
2. 确认前端域名拼写正确
3. 重新部署 Worker

### 4. 超时错误

**错误**：`Worker exceeded CPU time limit`

**解决**：
- OpenAI API 响应可能较慢
- 考虑使用更快的模型
- 检查是否有死循环

### 5. 查看详细错误

```bash
# 查看实时日志
wrangler tail

# 发送测试请求，观察日志
curl https://ai-chat-serverless.workers.dev/graphql ...
```

## 📈 性能优化

### 1. 使用缓存

```typescript
// 缓存常见回复（示例）
const cache = caches.default
const cacheKey = new Request(url, request)
const cachedResponse = await cache.match(cacheKey)
```

### 2. 优化依赖

减少打包体积：
- 只导入需要的模块
- 避免大型依赖库
- 使用 tree-shaking

### 3. 异步处理

使用 `waitUntil()` 处理非关键任务：

```typescript
c.executionCtx.waitUntil(
  logAnalytics(data)
)
```

## 🔗 相关链接

- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Wrangler CLI 文档](https://developers.cloudflare.com/workers/wrangler/)
- [前端部署指南](../frontend/DEPLOYMENT.md)
- [OpenAI API 文档](https://platform.openai.com/docs)

## 📝 部署清单

部署前检查：

- [ ] Wrangler CLI 已安装并登录
- [ ] OpenAI API Key 已准备
- [ ] `wrangler.toml` 配置正确
- [ ] 前端 URL 已确认
- [ ] 本地测试通过

部署后检查：

- [ ] Worker 部署成功
- [ ] Secret 已配置
- [ ] 健康检查通过 (`/health`)
- [ ] GraphQL API 正常 (`/graphql`)
- [ ] OpenAI 调用正常
- [ ] CORS 配置正确
- [ ] 前端已更新 API 地址
- [ ] 端到端测试通过

## 🎉 完成部署

恭喜！你的 AI 聊天助手后端已成功部署到 Cloudflare Workers。

**你的 API 端点**：
- 基础 URL: `https://ai-chat-serverless.workers.dev`
- GraphQL: `https://ai-chat-serverless.workers.dev/graphql`
- 健康检查: `https://ai-chat-serverless.workers.dev/health`

**下一步**：
1. 更新前端环境变量指向此 API
2. 测试完整的前后端集成
3. 配置自定义域名（可选）
4. 设置监控和告警

---

**问题反馈**：如果遇到问题，查看实时日志 `wrangler tail` 获取详细信息。
