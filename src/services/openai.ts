import OpenAI from 'openai'
import type { Message, OpenAIConfig } from '../types'

/**
 * 调用 OpenAI API 获取回复
 */
export async function getChatCompletion(
  messages: Message[],
  config: OpenAIConfig
): Promise<string> {
  const openai = new OpenAI({
    apiKey: config.apiKey,
  })

  try {
    // 转换消息格式为 OpenAI 格式
    const openaiMessages = messages.map((msg) => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    }))

    const completion = await openai.chat.completions.create({
      model: config.model,
      messages: openaiMessages,
      max_tokens: config.maxTokens,
      temperature: 0.7,
    })

    return completion.choices[0]?.message?.content || '抱歉，我无法生成回复。'
  } catch (error) {
    console.error('OpenAI API Error:', error)
    throw new Error('调用 OpenAI API 失败')
  }
}

/**
 * 流式调用 OpenAI API（未来扩展）
 */
export async function getChatCompletionStream(
  messages: Message[],
  config: OpenAIConfig
): Promise<ReadableStream> {
  const openai = new OpenAI({
    apiKey: config.apiKey,
  })

  const openaiMessages = messages.map((msg) => ({
    role: msg.role as 'user' | 'assistant' | 'system',
    content: msg.content,
  }))

  const stream = await openai.chat.completions.create({
    model: config.model,
    messages: openaiMessages,
    max_tokens: config.maxTokens,
    temperature: 0.7,
    stream: true,
  })

  // 创建一个 Web ReadableStream
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || ''
          if (content) {
            controller.enqueue(new TextEncoder().encode(content))
          }
        }
        controller.close()
      } catch (error) {
        controller.error(error)
      }
    },
  })
}
