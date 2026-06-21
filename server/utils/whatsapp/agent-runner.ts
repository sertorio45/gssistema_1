import type { SupabaseClient } from '@supabase/supabase-js'

import {
  buildToolsSystemPrompt,
  executeAgentTool,
  loadEnabledAgentTools,
  parseToolCall,
} from '~/server/utils/whatsapp/agent-tools'
import type { LlmProvider } from '~/server/utils/whatsapp/llm-client'
import { runLlmChat } from '~/server/utils/whatsapp/llm-client'

interface AgentFlowContext {
  tenantId: string
  messageContent: string
  contactPhone: string
  contactName?: string | null
  conversationId: string | null
  contactId: string | null
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
): Promise<{ reply: string, tokensUsed: number, sessionId: string | null }> {
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
  const systemPrompt = String(agent.system_prompt || '').trim()
  const userMessage = params.ctx.messageContent.trim()
  if (!userMessage)
    throw new Error('Empty user message for agent')

  const tools = await loadEnabledAgentTools(client, params.tenantId, params.agentId)
  const toolsPrompt = buildToolsSystemPrompt(tools)

  const messages: Array<{ role: 'system' | 'user' | 'assistant', content: string }> = []
  const combinedSystem = [systemPrompt, toolsPrompt].filter(Boolean).join('\n\n')
  if (combinedSystem)
    messages.push({ role: 'system', content: combinedSystem })

  for (const item of params.conversationHistory || [])
    messages.push(item)

  messages.push({
    role: 'user',
    content: [
      `Contato: ${params.ctx.contactName || params.ctx.contactPhone}`,
      `Telefone: ${params.ctx.contactPhone}`,
      `Mensagem: ${userMessage}`,
    ].join('\n'),
  })

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
      reply = 'Desculpe, não consegui concluir a ação solicitada. Um atendente humano pode ajudar em breve.'
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
    const { data: session } = await client
      .from('whatsapp_agent_session')
      .insert({
        tenant_id: params.tenantId,
        agent_id: params.agentId,
        conversation_id: params.ctx.conversationId,
        contact_id: params.ctx.contactId,
        status: 'active',
        messages_context: messages.concat({ role: 'assistant', content: reply }),
        tokens_used: totalTokens,
      })
      .select('id')
      .single()

    sessionId = session?.id as string || null
  }

  return { reply, tokensUsed: totalTokens, sessionId }
}
