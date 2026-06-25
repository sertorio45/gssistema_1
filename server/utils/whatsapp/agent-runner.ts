import type { SupabaseClient } from '@supabase/supabase-js'

import { DEFAULT_AGENT_SYSTEM_PROMPT } from '~/constants/whatsapp-llm'
import {
  buildAgentSystemPrompt,
  findActiveAgentSession,
  loadAgentContactContext,
  loadConversationHistoryForAgent,
  persistAgentSession,
} from '~/server/utils/whatsapp/agent-context'
import {
  buildToolsSystemPrompt,
  executeAgentTool,
  loadEnabledAgentTools,
  parseToolCall,
} from '~/server/utils/whatsapp/agent-tools'
import type { LlmProvider } from '~/server/utils/whatsapp/llm-client'
import { runLlmChat } from '~/server/utils/whatsapp/llm-client'
import { resolveLlmRequestParams } from '~/server/utils/whatsapp/llm-profiles'

export interface AgentFlowContext {
  tenantId: string
  messageContent: string
  contactPhone: string
  contactName?: string | null
  conversationId: string | null
  contactId: string | null
  messageId?: string | null
  isTest?: boolean
}

export async function runWhatsAppAgentReply(
  client: SupabaseClient,
  params: {
    tenantId: string
    agentId: string
    ctx: AgentFlowContext
    conversationHistory?: Array<{ role: 'user' | 'assistant', content: string }>
  },
): Promise<{ reply: string, tokensUsed: number, sessionId: string | null, historyMessages: number }> {
  const { data: agent, error } = await client
    .from('whatsapp_agent')
    .select('*')
    .eq('id', params.agentId)
    .eq('tenant_id', params.tenantId)
    .maybeSingle()

  if (error || !agent)
    throw new Error('Agent not found')

  if (!agent.is_active)
    throw new Error('Agent is inactive')

  const provider = (agent.llm_provider || 'ollama') as LlmProvider
  const llmParams = resolveLlmRequestParams(agent, provider)

  const userMessage = params.ctx.messageContent.trim()
  if (!userMessage)
    throw new Error('Empty user message for agent')

  const [tools, contact, history, activeSession] = await Promise.all([
    loadEnabledAgentTools(client, params.tenantId, params.agentId, {
      minimalInternal: llmParams.profile.family === 'reasoning',
    }),
    loadAgentContactContext(client, params.tenantId, params.ctx.contactId, {
      name: params.ctx.contactName,
      phone: params.ctx.contactPhone,
    }),
    params.conversationHistory
      ? Promise.resolve(params.conversationHistory.slice(-llmParams.maxHistoryMessages))
      : params.ctx.conversationId && !params.ctx.isTest
        ? loadConversationHistoryForAgent(client, {
            tenantId: params.tenantId,
            conversationId: params.ctx.conversationId,
            excludeMessageId: params.ctx.messageId,
            limit: llmParams.maxHistoryMessages,
          })
        : Promise.resolve([]),
    params.ctx.conversationId && !params.ctx.isTest
      ? findActiveAgentSession(client, {
          tenantId: params.tenantId,
          agentId: params.agentId,
          conversationId: params.ctx.conversationId,
        })
      : Promise.resolve(null),
  ])

  const toolsPrompt = buildToolsSystemPrompt(tools)
  const basePrompt = String(agent.system_prompt || '').trim() || DEFAULT_AGENT_SYSTEM_PROMPT
  const systemPrompt = buildAgentSystemPrompt({
    basePrompt,
    toolsPrompt,
    contact,
    compact: llmParams.profile.compactPrompt,
  })

  const messages: Array<{ role: 'system' | 'user' | 'assistant', content: string }> = [
    { role: 'system', content: systemPrompt },
  ]

  for (const item of history)
    messages.push(item)

  messages.push({ role: 'user', content: userMessage })

  let totalTokens = 0
  let reply = ''
  const maxIterations = llmParams.maxToolIterations

  for (let iteration = 0; iteration <= maxIterations; iteration++) {
    const result = await runLlmChat({
      provider,
      model: llmParams.model,
      temperature: llmParams.temperature,
      maxTokens: llmParams.maxTokens,
      messages,
      options: {
        profile: {
          disableThinking: llmParams.profile.disableThinking,
          stripThinking: llmParams.profile.stripThinking,
          numCtx: llmParams.profile.numCtx,
        },
      },
    })

    totalTokens += result.tokensUsed
    const toolCall = parseToolCall(result.content)

    if (!toolCall) {
      reply = result.content
      break
    }

    if (iteration === maxIterations) {
      reply = 'Preciso de mais informações ou de um atendente humano para concluir seu pedido. Pode me contar um pouco mais?'
      break
    }

    const toolResult = await executeAgentTool(client, {
      tenantId: params.tenantId,
      contactId: params.ctx.contactId,
      conversationId: params.ctx.conversationId,
      contactPhone: params.ctx.contactPhone,
      contactName: params.ctx.contactName,
      isTest: params.ctx.isTest,
    }, toolCall)

    messages.push({ role: 'assistant', content: result.content })
    messages.push({ role: 'user', content: `Resultado da ferramenta ${toolCall.tool}: ${toolResult}` })
  }

  if (!reply.trim())
    throw new Error('Agent returned empty response')

  let sessionId: string | null = null

  if (!params.ctx.isTest && params.ctx.conversationId) {
    const messagesContext = messages
      .filter(item => item.role !== 'system')
      .concat({ role: 'assistant', content: reply })

    sessionId = await persistAgentSession(client, {
      tenantId: params.tenantId,
      agentId: params.agentId,
      conversationId: params.ctx.conversationId,
      contactId: params.ctx.contactId,
      messagesContext,
      tokensUsed: totalTokens,
      existingSessionId: activeSession?.id,
      previousTokensUsed: activeSession?.tokensUsed,
    })
  }

  return {
    reply,
    tokensUsed: totalTokens,
    sessionId,
    historyMessages: history.length,
  }
}
