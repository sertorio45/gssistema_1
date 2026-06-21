import type { SupabaseClient } from '@supabase/supabase-js'

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

const MAX_TOOL_ITERATIONS = 3

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
  const userMessage = params.ctx.messageContent.trim()
  if (!userMessage)
    throw new Error('Empty user message for agent')

  const [tools, contact, history, activeSession] = await Promise.all([
    loadEnabledAgentTools(client, params.tenantId, params.agentId),
    loadAgentContactContext(client, params.tenantId, params.ctx.contactId, {
      name: params.ctx.contactName,
      phone: params.ctx.contactPhone,
    }),
    params.conversationHistory
      ? Promise.resolve(params.conversationHistory)
      : params.ctx.conversationId && !params.ctx.isTest
        ? loadConversationHistoryForAgent(client, {
            tenantId: params.tenantId,
            conversationId: params.ctx.conversationId,
            excludeMessageId: params.ctx.messageId,
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
  const systemPrompt = buildAgentSystemPrompt({
    basePrompt: String(agent.system_prompt || '').trim(),
    toolsPrompt,
    contact,
  })

  const messages: Array<{ role: 'system' | 'user' | 'assistant', content: string }> = [
    { role: 'system', content: systemPrompt },
  ]

  for (const item of history)
    messages.push(item)

  messages.push({ role: 'user', content: userMessage })

  let totalTokens = 0
  let reply = ''

  for (let iteration = 0; iteration <= MAX_TOOL_ITERATIONS; iteration++) {
    const result = await runLlmChat({
      provider,
      model: agent.model || (provider === 'ollama' ? 'qwen' : 'gpt-4o-mini'),
      temperature: Number(agent.temperature ?? 0.7),
      maxTokens: Number(agent.max_tokens ?? 1024),
      messages,
    })

    totalTokens += result.tokensUsed
    const toolCall = parseToolCall(result.content)

    if (!toolCall) {
      reply = result.content
      break
    }

    if (iteration === MAX_TOOL_ITERATIONS) {
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
