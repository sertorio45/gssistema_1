import type { SupabaseClient } from '@supabase/supabase-js'

import {
  closeAgentSession,
  formatWhatsAppMessageForAgent,
  persistAgentSession,
} from '~/server/utils/whatsapp/agent-context'
import { runWhatsAppAgentReply } from '~/server/utils/whatsapp/agent-runner'
import { loadInstanceWithIntegrationByClient } from '~/server/utils/whatsapp/instance-loader'
import { sendWhatsAppTextMessage } from '~/server/utils/whatsapp/message-sender'
import { broadcastWhatsAppEvent } from '~/server/utils/whatsapp/realtime-broadcast'

export interface ConversationAgentSession {
  sessionId: string
  agentId: string
  agentName: string
}

export async function findActiveConversationAgentSession(
  client: SupabaseClient,
  tenantId: string,
  conversationId: string,
): Promise<ConversationAgentSession | null> {
  const { data } = await client
    .from('whatsapp_agent_session')
    .select('id, agent_id, whatsapp_agent(name)')
    .eq('tenant_id', tenantId)
    .eq('conversation_id', conversationId)
    .eq('status', 'active')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data?.id || !data.agent_id)
    return null

  const agent = data.whatsapp_agent as { name?: string } | null

  return {
    sessionId: data.id as string,
    agentId: data.agent_id as string,
    agentName: agent?.name || 'Agente IA',
  }
}

export async function conversationHasActiveAgent(
  client: SupabaseClient,
  tenantId: string,
  conversationId: string,
): Promise<boolean> {
  const session = await findActiveConversationAgentSession(client, tenantId, conversationId)
  return Boolean(session)
}

export async function closeConversationAgentSessions(
  client: SupabaseClient,
  tenantId: string,
  conversationId: string,
): Promise<void> {
  const { data: sessions } = await client
    .from('whatsapp_agent_session')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('conversation_id', conversationId)
    .eq('status', 'active')

  for (const session of sessions || []) {
    await closeAgentSession(client, tenantId, session.id as string)
  }
}

export async function enableConversationAgent(
  client: SupabaseClient,
  params: {
    tenantId: string
    conversationId: string
    contactId: string | null
    agentId: string
  },
): Promise<ConversationAgentSession> {
  const { data: agent, error } = await client
    .from('whatsapp_agent')
    .select('id, name, is_active')
    .eq('id', params.agentId)
    .eq('tenant_id', params.tenantId)
    .maybeSingle()

  if (error || !agent)
    throw new Error('Agent not found')

  if (!agent.is_active)
    throw new Error('Agent is inactive')

  await closeConversationAgentSessions(client, params.tenantId, params.conversationId)

  const sessionId = await persistAgentSession(client, {
    tenantId: params.tenantId,
    agentId: params.agentId,
    conversationId: params.conversationId,
    contactId: params.contactId,
    messagesContext: [],
    tokensUsed: 0,
  })

  if (!sessionId)
    throw new Error('Failed to enable conversation agent')

  return {
    sessionId,
    agentId: params.agentId,
    agentName: String(agent.name || 'Agente IA'),
  }
}

function extractProviderMessageId(providerResult: Record<string, unknown>): string | null {
  const key = providerResult?.key as { id?: string } | undefined
  const messages = providerResult?.messages as Array<{ id?: string }> | undefined
  return key?.id || messages?.[0]?.id || null
}

async function persistAgentOutboundMessage(
  client: SupabaseClient,
  params: {
    tenantId: string
    conversationId: string
    instanceId: string
    contactId: string | null
    remoteJid: string
    content: string
    externalId: string | null
  },
) {
  const now = new Date().toISOString()

  const { data: message } = await client
    .from('whatsapp_message')
    .insert({
      tenant_id: params.tenantId,
      conversation_id: params.conversationId,
      instance_id: params.instanceId,
      contact_id: params.contactId,
      external_id: params.externalId,
      remote_jid: params.remoteJid,
      from_me: true,
      message_type: 'text',
      content: params.content,
      status: 'sent',
      sent_at: now,
      metadata: { source: 'whatsapp_agent' },
    })
    .select('*')
    .single()

  await client
    .from('whatsapp_conversation')
    .update({
      last_message_preview: params.content.slice(0, 120),
      last_message_at: now,
      updated_at: now,
    })
    .eq('id', params.conversationId)

  if (message)
    await broadcastWhatsAppEvent(params.tenantId, 'message', message)

  return message
}

export async function replyToPendingInboundOnAgentEnable(
  client: SupabaseClient,
  params: {
    tenantId: string
    conversationId: string
  },
): Promise<{ replied: boolean, reply?: string }> {
  const { data: conversation } = await client
    .from('whatsapp_conversation')
    .select('instance_id, contact_id, remote_jid, contact_phone, contact_name')
    .eq('id', params.conversationId)
    .eq('tenant_id', params.tenantId)
    .maybeSingle()

  if (!conversation?.instance_id)
    return { replied: false }

  const { data: lastMessage } = await client
    .from('whatsapp_message')
    .select('id, from_me, content, message_type, file_name')
    .eq('conversation_id', params.conversationId)
    .eq('tenant_id', params.tenantId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!lastMessage || lastMessage.from_me)
    return { replied: false }

  const messageContent = formatWhatsAppMessageForAgent(lastMessage).trim() || '[Mídia recebida]'

  const result = await dispatchConversationAgentReply(client, {
    tenantId: params.tenantId,
    instanceId: conversation.instance_id as string,
    contactId: conversation.contact_id as string | null,
    conversationId: params.conversationId,
    remoteJid: conversation.remote_jid as string,
    messageId: lastMessage.id as string,
    messageContent,
    contactPhone: conversation.contact_phone as string,
    contactName: conversation.contact_name as string | null,
  })

  return {
    replied: Boolean(result.handled && result.reply),
    reply: result.reply,
  }
}

export async function dispatchConversationAgentReply(
  client: SupabaseClient,
  params: {
    tenantId: string
    instanceId: string
    contactId: string | null
    conversationId: string
    remoteJid: string
    messageId: string
    messageContent: string
    contactPhone: string
    contactName?: string | null
  },
): Promise<{ handled: boolean, reply?: string }> {
  const activeSession = await findActiveConversationAgentSession(
    client,
    params.tenantId,
    params.conversationId,
  )

  if (!activeSession)
    return { handled: false }

  const userMessage = params.messageContent.trim() || '[Mídia recebida]'

  try {
    const { reply } = await runWhatsAppAgentReply(client, {
      tenantId: params.tenantId,
      agentId: activeSession.agentId,
      ctx: {
        tenantId: params.tenantId,
        messageContent: userMessage,
        contactPhone: params.contactPhone,
        contactName: params.contactName,
        conversationId: params.conversationId,
        contactId: params.contactId,
        messageId: params.messageId,
      },
    })

    if (!reply?.trim())
      return { handled: true }

    const { instance, integration } = await loadInstanceWithIntegrationByClient(client, params.instanceId)
    const providerResult = await sendWhatsAppTextMessage({
      instance,
      integration,
      phone: params.contactPhone,
      remoteJid: params.remoteJid,
      text: reply,
    }) as Record<string, unknown>

    await persistAgentOutboundMessage(client, {
      tenantId: params.tenantId,
      conversationId: params.conversationId,
      instanceId: params.instanceId,
      contactId: params.contactId,
      remoteJid: params.remoteJid,
      content: reply,
      externalId: extractProviderMessageId(providerResult),
    })

    return { handled: true, reply }
  }
  catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Agent failed'
    console.error('[WhatsApp] Conversation agent reply failed:', message)
    return { handled: false }
  }
}
