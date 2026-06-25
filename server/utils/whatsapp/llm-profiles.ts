import type { LlmProvider } from '~/server/utils/whatsapp/llm-client'

export type LlmModelFamily = 'reasoning' | 'chat' | 'default'

export interface LlmModelProfile {
  family: LlmModelFamily
  /** Limite sugerido de tokens de saída */
  maxTokens: number
  temperature: number
  /** Mensagens de histórico enviadas ao modelo */
  maxHistoryMessages: number
  /** Ollama: desativa chain-of-thought (DeepSeek R1, QwQ, etc.) */
  disableThinking: boolean
  /** Remove blocos de raciocínio da resposta */
  stripThinking: boolean
  /** Prompt de sistema enxuto */
  compactPrompt: boolean
  maxToolIterations: number
  /** Contexto Ollama (menor = mais rápido em modelos grandes) */
  numCtx?: number
}

function detectModelFamily(model: string): LlmModelFamily {
  const name = model.toLowerCase()

  if (
    name.includes('deepseek-r1')
    || name.includes('deepseek_r1')
    || name.includes('r1:')
    || name.includes('r1-')
    || name.includes('qwq')
    || name.includes('reasoner')
    || name.includes('o1')
  ) {
    return 'reasoning'
  }

  if (
    name.includes('deepseek')
    || name.includes('qwen')
    || name.includes('llama')
    || name.includes('mistral')
    || name.includes('gemma')
    || name.includes('phi')
    || name.includes('gpt-oss')
  ) {
    return 'chat'
  }

  return 'default'
}

const FAMILY_PROFILES: Record<LlmModelFamily, LlmModelProfile> = {
  reasoning: {
    family: 'reasoning',
    maxTokens: 512,
    temperature: 0.4,
    maxHistoryMessages: 6,
    disableThinking: true,
    stripThinking: true,
    compactPrompt: true,
    maxToolIterations: 2,
    numCtx: 4096,
  },
  chat: {
    family: 'chat',
    maxTokens: 768,
    temperature: 0.5,
    maxHistoryMessages: 10,
    disableThinking: false,
    stripThinking: false,
    compactPrompt: true,
    maxToolIterations: 3,
    numCtx: 8192,
  },
  default: {
    family: 'default',
    maxTokens: 1024,
    temperature: 0.7,
    maxHistoryMessages: 15,
    disableThinking: false,
    stripThinking: false,
    compactPrompt: false,
    maxToolIterations: 3,
    numCtx: 8192,
  },
}

export function resolveModelProfile(model: string, provider: LlmProvider): LlmModelProfile {
  const family = detectModelFamily(model)
  const base = FAMILY_PROFILES[family]

  // OpenAI: não usa thinking; perfil reasoning vira chat enxuto
  if (provider === 'openai' && family === 'reasoning') {
    return {
      ...base,
      disableThinking: false,
      stripThinking: false,
      maxTokens: 600,
      maxHistoryMessages: 8,
    }
  }

  return { ...base }
}

export function resolveLlmRequestParams(
  agent: {
    model?: string | null
    temperature?: number | null
    max_tokens?: number | null
  },
  provider: LlmProvider,
): {
  profile: LlmModelProfile
  model: string
  temperature: number
  maxTokens: number
  maxHistoryMessages: number
  maxToolIterations: number
} {
  const model = String(agent.model || (provider === 'ollama' ? 'qwen' : 'gpt-4o-mini')).trim()
  const profile = resolveModelProfile(model, provider)

  const agentTemperature = Number(agent.temperature)
  const agentMaxTokens = Number(agent.max_tokens)

  const temperature = profile.family === 'reasoning'
    ? Math.min(Number.isFinite(agentTemperature) ? agentTemperature : profile.temperature, profile.temperature)
    : (Number.isFinite(agentTemperature) ? agentTemperature : profile.temperature)

  const maxTokens = profile.family === 'reasoning'
    ? Math.min(Number.isFinite(agentMaxTokens) ? agentMaxTokens : profile.maxTokens, profile.maxTokens)
    : (Number.isFinite(agentMaxTokens) ? agentMaxTokens : profile.maxTokens)

  return {
    profile,
    model,
    temperature,
    maxTokens,
    maxHistoryMessages: profile.maxHistoryMessages,
    maxToolIterations: profile.maxToolIterations,
  }
}

export function isReasoningModel(model: string): boolean {
  return detectModelFamily(model) === 'reasoning'
}
