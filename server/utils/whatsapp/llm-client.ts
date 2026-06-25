import type { OllamaChatMessage } from '~/server/utils/whatsapp/ollama-client'
import { ollamaChat } from '~/server/utils/whatsapp/ollama-client'
import { sanitizeLlmOutput } from '~/server/utils/whatsapp/llm-output'
import type { LlmModelProfile } from '~/server/utils/whatsapp/llm-profiles'

export type LlmProvider = 'ollama' | 'openai'

export interface LlmChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LlmChatOptions {
  profile?: Pick<LlmModelProfile, 'disableThinking' | 'stripThinking' | 'numCtx'>
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
  options?: LlmChatOptions
}): Promise<{ content: string, tokensUsed: number }> {
  const stripThinking = params.options?.profile?.stripThinking ?? false

  if (params.provider === 'ollama') {
    const result = await ollamaChat({
      model: params.model,
      messages: params.messages as OllamaChatMessage[],
      temperature: params.temperature,
      maxTokens: params.maxTokens,
      think: params.options?.profile?.disableThinking ? false : undefined,
      numCtx: params.options?.profile?.numCtx,
    })

    return {
      content: sanitizeLlmOutput(result.content, { stripThinking }),
      tokensUsed: result.tokensUsed,
    }
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

  const raw = String(response.choices?.[0]?.message?.content || '').trim()
  const content = sanitizeLlmOutput(raw, { stripThinking })
  if (!content)
    throw new Error('OpenAI returned empty response')

  return {
    content,
    tokensUsed: Number(response.usage?.total_tokens || 0),
  }
}
