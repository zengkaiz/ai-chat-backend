import type { GraphQLContext, Conversation, Message } from '../types'
import { getChatCompletion } from '../services/openai'
import { generateId, getCurrentTimestamp, getOpenAIConfig } from '../utils'

// 内存存储（简单实现，实际应该使用 KV 或 D1）
const conversationsStore = new Map<string, Conversation>()

export const resolvers = {
  Query: {
    // 获取所有会话
    conversations: async (_: any, __: any, context: GraphQLContext) => {
      return Array.from(conversationsStore.values()).sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
    },

    // 获取单个会话
    conversation: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      return conversationsStore.get(id) || null
    },
  },

  Mutation: {
    // 创建新会话
    createConversation: async (
      _: any,
      { title }: { title?: string },
      context: GraphQLContext
    ) => {
      const conversation: Conversation = {
        id: generateId(),
        title: title || '新对话',
        messages: [],
        createdAt: getCurrentTimestamp(),
        updatedAt: getCurrentTimestamp(),
      }

      conversationsStore.set(conversation.id, conversation)
      return conversation
    },

    // 发送消息
    sendMessage: async (
      _: any,
      { conversationId, message }: { conversationId: string; message: string },
      context: GraphQLContext
    ) => {
      let conversation = conversationsStore.get(conversationId)

      // 如果会话不存在，自动创建一个
      if (!conversation) {
        conversation = {
          id: conversationId,
          title: '新对话',
          messages: [],
          createdAt: getCurrentTimestamp(),
          updatedAt: getCurrentTimestamp(),
        }
        conversationsStore.set(conversationId, conversation)
      }

      // 添加用户消息
      const userMessage: Message = {
        id: generateId(),
        role: 'user',
        content: message,
        timestamp: getCurrentTimestamp(),
      }

      conversation.messages.push(userMessage)

      // 调用 OpenAI 获取回复
      const config = getOpenAIConfig(context.env)
      const aiResponse = await getChatCompletion(conversation.messages, config)

      // 添加 AI 回复
      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: aiResponse,
        timestamp: getCurrentTimestamp(),
      }

      conversation.messages.push(assistantMessage)
      conversation.updatedAt = getCurrentTimestamp()

      conversationsStore.set(conversationId, conversation)

      return assistantMessage
    },

    // 删除会话
    deleteConversation: async (
      _: any,
      { id }: { id: string },
      context: GraphQLContext
    ) => {
      const deleted = conversationsStore.delete(id)
      return deleted
    },
  },
}
