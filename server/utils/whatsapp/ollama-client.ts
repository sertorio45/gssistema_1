export interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface OllamaChatResponse {
  message?: { role?: string, content?: string }
  eval_count?: number
  prompt_eval_count?: number
}

export interface OllamaGenerateResponse {
  response?: string
  eval_count?: number
  prompt_eval_count?: number
}

export interface OllamaConfig {
  baseUrl: string
  cfAccessClientId?: string
  cfAccessClientSecret?: string
}

export function getOllamaConfig(): OllamaConfig {
  return {
    baseUrl: (process.env.OLLAMA_BASE_URL || 'https://ollama.gsstudio.com.br').replace(/\/$/, ''),
    cfAccessClientId: process.env.OLLAMA_CF_ACCESS_CLIENT_ID || process.env.CF_ACCESS_CLIENT_ID,
    cfAccessClientSecret: process.env.OLLAMA_CF_ACCESS_CLIENT_SECRET || process.env.CF_ACCESS_CLIENT_SECRET,
  }
}

function buildOllamaHeaders(config: OllamaConfig): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (config.cfAccessClientId)
    headers['CF-Access-Client-Id'] = config.cfAccessClientId

  if (config.cfAccessClientSecret)
    headers['CF-Access-Client-Secret'] = config.cfAccessClientSecret

  return headers
}

export async function ollamaChat(params: {
  model: string
  messages: OllamaChatMessage[]
  temperature?: number
  maxTokens?: number
  config?: OllamaConfig
}): Promise<{ content: string, tokensUsed: number }> {
  const config = params.config || getOllamaConfig()

  if (!config.baseUrl)
    throw new Error('OLLAMA_BASE_URL is not configured')

  const response = await $fetch<OllamaChatResponse>(`${config.baseUrl}/api/chat`, {
    method: 'POST',
    headers: buildOllamaHeaders(config),
    body: {
      model: params.model,
      messages: params.messages,
      stream: false,
      options: {
        temperature: params.temperature ?? 0.7,
        num_predict: params.maxTokens ?? 1024,
      },
    },
  })

  const content = String(response.message?.content || '').trim()
  if (!content)
    throw new Error('Ollama returned empty response')

  const tokensUsed = Number(response.eval_count || 0) + Number(response.prompt_eval_count || 0)
  return { content, tokensUsed }
}

export async function ollamaGenerate(params: {
  model: string
  prompt: string
  temperature?: number
  maxTokens?: number
  config?: OllamaConfig
}): Promise<{ content: string, tokensUsed: number }> {
  const config = params.config || getOllamaConfig()

  if (!config.baseUrl)
    throw new Error('OLLAMA_BASE_URL is not configured')

  const response = await $fetch<OllamaGenerateResponse>(`${config.baseUrl}/api/generate`, {
    method: 'POST',
    headers: buildOllamaHeaders(config),
    body: {
      model: params.model,
      prompt: params.prompt,
      stream: false,
      options: {
        temperature: params.temperature ?? 0.7,
        num_predict: params.maxTokens ?? 1024,
      },
    },
  })

  const content = String(response.response || '').trim()
  if (!content)
    throw new Error('Ollama returned empty response')

  const tokensUsed = Number(response.eval_count || 0) + Number(response.prompt_eval_count || 0)
  return { content, tokensUsed }
}

export async function testOllamaConnection(params?: {
  model?: string
  config?: OllamaConfig
}): Promise<{ ok: true, model: string, reply: string, tokensUsed: number }> {
  const model = params?.model || process.env.OLLAMA_DEFAULT_MODEL || 'qwen'
  const { content, tokensUsed } = await ollamaChat({
    model,
    messages: [{ role: 'user', content: 'Responda apenas: ok' }],
    config: params?.config,
  })

  return { ok: true, model, reply: content, tokensUsed }
}
