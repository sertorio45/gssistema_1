import type { SupabaseClient } from '@supabase/supabase-js'

export interface ConversationActiveAgentMeta {
  agentId: string
  agentName: string | null
}

export async function loadActiveAgentsForConversations(
  client: SupabaseClient,
  tenantId: string,
  conversationIds: string[],
): Promise<Map<string, ConversationActiveAgentMeta>> {
  const map = new Map<string, ConversationActiveAgentMeta>()

  if (!conversationIds.length)
    return map

  const { data: sessions } = await client
    .from('whatsapp_agent_session')
    .select('conversation_id, agent_id, started_at, whatsapp_agent(name)')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .in('conversation_id', conversationIds)
    .order('started_at', { ascending: false })

  for (const session of sessions || []) {
    const conversationId = session.conversation_id as string | null
    const agentId = session.agent_id as string | null

    if (!conversationId || !agentId || map.has(conversationId))
      continue

    const agent = session.whatsapp_agent as { name?: string } | null
    map.set(conversationId, {
      agentId,
      agentName: agent?.name ?? null,
    })
  }

  return map
}
