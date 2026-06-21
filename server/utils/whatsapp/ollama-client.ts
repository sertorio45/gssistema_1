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

export interface OllamaConfigStatus {
  baseUrl: string
  hasClientId: boolean
  hasClientSecret: boolean
  ready: boolean
  runtime: string
  hint: string
}

function readSecret(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key]?.trim()
    if (value)
      return value
  }
  return undefined
}

export function getOllamaConfig(): OllamaConfig {
  let runtime: ReturnType<typeof useRuntimeConfig> | null = null
  try {
    runtime = useRuntimeConfig()
  }
  catch {
    runtime = null
  }

  const baseUrl = (
    readSecret('OLLAMA_BASE_URL', 'NUXT_OLLAMA_BASE_URL')
    || String(runtime?.ollamaBaseUrl || '')
    || 'https://ollama.gsstudio.com.br'
  ).replace(/\/$/, '')

  const cfAccessClientId = readSecret(
    'OLLAMA_CF_ACCESS_CLIENT_ID',
    'CF_ACCESS_CLIENT_ID',
    'NUXT_OLLAMA_CF_ACCESS_CLIENT_ID',
  ) || String(runtime?.ollamaCfAccessClientId || '') || undefined

  const cfAccessClientSecret = readSecret(
    'OLLAMA_CF_ACCESS_CLIENT_SECRET',
    'CF_ACCESS_CLIENT_SECRET',
    'NUXT_OLLAMA_CF_ACCESS_CLIENT_SECRET',
  ) || String(runtime?.ollamaCfAccessClientSecret || '') || undefined

  return { baseUrl, cfAccessClientId, cfAccessClientSecret }
}

export function getOllamaConfigStatus(): OllamaConfigStatus {
  const config = getOllamaConfig()
  const hasClientId = Boolean(config.cfAccessClientId)
  const hasClientSecret = Boolean(config.cfAccessClientSecret)
  const ready = Boolean(config.baseUrl && hasClientId && hasClientSecret)

  let hint = 'Configuração OK — use Service Token CF-Access (não bypass por IP).'
  if (!hasClientId || !hasClientSecret) {
    hint = 'Na Vercel: Settings → Environment Variables → adicione OLLAMA_CF_ACCESS_CLIENT_ID e OLLAMA_CF_ACCESS_CLIENT_SECRET em Production → Redeploy.'
  }

  return {
    baseUrl: config.baseUrl,
    hasClientId,
    hasClientSecret,
    ready,
    runtime: process.env.VERCEL ? 'vercel' : (process.env.NODE_ENV || 'unknown'),
    hint,
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

  if (!config.cfAccessClientId || !config.cfAccessClientSecret) {
    throw new Error(
      process.env.VERCEL
        ? 'Credenciais Ollama ausentes na Vercel. Adicione OLLAMA_CF_ACCESS_CLIENT_ID e OLLAMA_CF_ACCESS_CLIENT_SECRET em Environment Variables (Production) e faça redeploy.'
        : 'Configure OLLAMA_CF_ACCESS_CLIENT_ID e OLLAMA_CF_ACCESS_CLIENT_SECRET no .env do servidor.',
    )
  }

  try {
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
  catch (error: any) {
    const status = error?.statusCode || error?.response?.status
    if (status === 403) {
      throw new Error(
        process.env.VERCEL
          ? 'Ollama 403 na Vercel — bypass por IP não funciona (IPs dinâmicos). Use Service Token CF-Access nas variáveis de ambiente e adicione política "Service Auth" no app Cloudflare.'
          : 'Ollama retornou 403 Forbidden — verifique Service Token CF-Access (Client-Id + Client-Secret).',
      )
    }
    throw error
  }
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
}): Promise<{ ok: true, model: string, reply: string, tokensUsed: number, status: OllamaConfigStatus }> {
  const status = getOllamaConfigStatus()
  let runtime: ReturnType<typeof useRuntimeConfig> | null = null
  try {
    runtime = useRuntimeConfig()
  }
  catch {
    runtime = null
  }

  const model = params?.model
    || readSecret('OLLAMA_DEFAULT_MODEL', 'NUXT_OLLAMA_DEFAULT_MODEL')
    || String(runtime?.ollamaDefaultModel || '')
    || 'qwen'

  const { content, tokensUsed } = await ollamaChat({
    model,
    messages: [{ role: 'user', content: 'Responda apenas: ok' }],
    config: params?.config,
  })

  return { ok: true, model, reply: content, tokensUsed, status }
}
