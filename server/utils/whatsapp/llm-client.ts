import type { OllamaChatMessage } from '~/server/utils/whatsapp/ollama-client'
import { ollamaChat } from '~/server/utils/whatsapp/ollama-client'

export type LlmProvider = 'ollama' | 'openai'

export interface LlmChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface OpenAIChatResponse {
  choices?: Array<{ message?: { content?: string } }>
  usage?: { total_tokens?: number }
}

export async function runLlmChat(params: {
  provider: LlmProvider
  model: string
  messages: LlmChatMessage[]
  temperature?: number
  maxTokens?: number
}): Promise<{ content: string, tokensUsed: number }> {
  if (params.provider === 'ollama') {
    return ollamaChat({
      model: params.model,
      messages: params.messages as OllamaChatMessage[],
      temperature: params.temperature,
      maxTokens: params.maxTokens,
    })
  }

  const apiKey = process.env.OPENAI_API_KEY || process.env.NUXT_OPENAI_API_KEY
  if (!apiKey)
    throw new Error('OPENAI_API_KEY is not configured')

  const response = await $fetch<OpenAIChatResponse>('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: {
      model: params.model || 'gpt-4o-mini',
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxTokens ?? 1024,
      messages: params.messages,
    },
  })

  const content = String(response.choices?.[0]?.message?.content || '').trim()
  if (!content)
    throw new Error('OpenAI returned empty response')

  return {
    content,
    tokensUsed: Number(response.usage?.total_tokens || 0),
  }
}
