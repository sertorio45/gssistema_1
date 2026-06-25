import type { SupabaseClient } from '@supabase/supabase-js'

export interface AgentChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AgentContactContext {
  name: string
  phone: string
  tags: string[]
}

const DEFAULT_HISTORY_LIMIT = 20
const MAX_MESSAGE_CHARS = 2000

const MEDIA_LABELS: Record<string, string> = {
  image: 'Imagem',
  audio: 'Áudio',
  video: 'Vídeo',
  document: 'Documento',
  sticker: 'Figurinha',
  location: 'Localização',
  template: 'Template',
  interactive: 'Mensagem interativa',
}

export function formatWhatsAppMessageForAgent(row: {
  content?: string | null
  message_type?: string | null
  file_name?: string | null
}): string {
  const type = String(row.message_type || 'text').toLowerCase()
  const text = String(row.content || '').trim()

  if (type === 'text' || !type)
    return text.slice(0, MAX_MESSAGE_CHARS)

  const label = MEDIA_LABELS[type] || 'Mídia'
  const fileSuffix = row.file_name ? `: ${row.file_name}` : ''
  const prefix = `[${label}${fileSuffix}]`

  if (!text)
    return prefix

  return `${prefix} ${text}`.slice(0, MAX_MESSAGE_CHARS)
}

export async function loadAgentContactContext(
  client: SupabaseClient,
  tenantId: string,
  contactId: string | null,
  fallback: { name?: string | null, phone: string },
): Promise<AgentContactContext> {
  if (!contactId) {
    return {
      name: fallback.name?.trim() || fallback.phone,
      phone: fallback.phone,
      tags: [],
    }
  }

  const { data } = await client
    .from('whatsapp_contact')
    .select('name, phone, tags')
    .eq('id', contactId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  return {
    name: data?.name?.trim() || fallback.name?.trim() || data?.phone || fallback.phone,
    phone: data?.phone || fallback.phone,
    tags: data?.tags || [],
  }
}

export async function loadConversationHistoryForAgent(
  client: SupabaseClient,
  params: {
    tenantId: string
    conversationId: string
    limit?: number
    excludeMessageId?: string | null
  },
): Promise<AgentChatMessage[]> {
  const limit = params.limit ?? DEFAULT_HISTORY_LIMIT

  const { data: rows } = await client
    .from('whatsapp_message')
    .select('id, from_me, content, message_type, file_name, sent_at, created_at')
    .eq('tenant_id', params.tenantId)
    .eq('conversation_id', params.conversationId)
    .order('created_at', { ascending: false })
    .limit(limit + 5)

  const chronological = [...(rows || [])]
    .sort((a, b) => {
      const timeA = new Date(a.sent_at || a.created_at || 0).getTime()
      const timeB = new Date(b.sent_at || b.created_at || 0).getTime()
      return timeA - timeB
    })

  const history: AgentChatMessage[] = []

  for (const row of chronological) {
    if (params.excludeMessageId && row.id === params.excludeMessageId)
      continue

    const content = formatWhatsAppMessageForAgent(row)
    if (!content)
      continue

    history.push({
      role: row.from_me ? 'assistant' : 'user',
      content,
    })
  }

  return history.slice(-limit)
}

export function buildAgentSystemPrompt(params: {
  basePrompt: string
  toolsPrompt: string
  contact: AgentContactContext
  compact?: boolean
}): string {
  const tagsLine = params.contact.tags.length
    ? params.contact.tags.join(', ')
    : '—'

  if (params.compact) {
    const contextLine = `Contato: ${params.contact.name} (${params.contact.phone}). Etiquetas: ${tagsLine}.`
    return [params.basePrompt, contextLine, params.toolsPrompt].filter(Boolean).join('\n')
  }

  const contextBlock = [
    '## Contexto do atendimento',
    `- Contato: ${params.contact.name}`,
    `- Telefone: ${params.contact.phone}`,
    `- Etiquetas: ${tagsLine}`,
    '',
    '## Diretrizes',
    '- Mantenha continuidade com o histórico da conversa.',
    '- Responda em português, com tom profissional, claro e objetivo.',
    '- Não invente fatos, preços, prazos ou dados que não estejam no histórico ou nas ferramentas.',
    '- Se faltar informação, faça uma pergunta objetiva ou encaminhe para atendimento humano.',
  ].join('\n')

  return [params.basePrompt, contextBlock, params.toolsPrompt].filter(Boolean).join('\n\n')
}

export async function findActiveAgentSession(
  client: SupabaseClient,
  params: {
    tenantId: string
    agentId: string
    conversationId: string
  },
): Promise<{ id: string, tokensUsed: number } | null> {
  const { data } = await client
    .from('whatsapp_agent_session')
    .select('id, tokens_used')
    .eq('tenant_id', params.tenantId)
    .eq('agent_id', params.agentId)
    .eq('conversation_id', params.conversationId)
    .eq('status', 'active')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data?.id)
    return null

  return {
    id: data.id as string,
    tokensUsed: Number(data.tokens_used || 0),
  }
}

export async function persistAgentSession(
  client: SupabaseClient,
  params: {
    tenantId: string
    agentId: string
    conversationId: string
    contactId: string | null
    messagesContext: Array<{ role: string, content: string }>
    tokensUsed: number
    existingSessionId?: string | null
    previousTokensUsed?: number
  },
): Promise<string | null> {
  const now = new Date().toISOString()
  const totalTokens = (params.previousTokensUsed || 0) + params.tokensUsed

  if (params.existingSessionId) {
    await client
      .from('whatsapp_agent_session')
      .update({
        messages_context: params.messagesContext,
        tokens_used: totalTokens,
        updated_at: now,
      })
      .eq('id', params.existingSessionId)
      .eq('tenant_id', params.tenantId)

    return params.existingSessionId
  }

  const { data: session } = await client
    .from('whatsapp_agent_session')
    .insert({
      tenant_id: params.tenantId,
      agent_id: params.agentId,
      conversation_id: params.conversationId,
      contact_id: params.contactId,
      status: 'active',
      messages_context: params.messagesContext,
      tokens_used: params.tokensUsed,
    })
    .select('id')
    .single()

  return session?.id as string || null
}

export async function closeAgentSession(
  client: SupabaseClient,
  tenantId: string,
  sessionId: string,
): Promise<void> {
  await client
    .from('whatsapp_agent_session')
    .update({
      status: 'closed',
      ended_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .eq('tenant_id', tenantId)
}
