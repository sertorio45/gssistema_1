import { createError, getQuery } from 'h3'

import { mapConversationRow } from '~/composables/whatsapp/useWhatsAppMapper'
import { loadActiveAgentsForConversations } from '~/server/utils/whatsapp/conversation-agent-meta'
import { resolveWhatsAppTenantContext } from '~/server/utils/whatsapp/context'
import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, statusMessage: 'id is required' })

  const query = getQuery(event)
  const { tenantId } = await resolveWhatsAppTenantContext(event, query.tenant_id as string | undefined)
  const client = serverSupabaseServiceRole(event)

  const { data, error } = await client
    .from('whatsapp_conversation')
    .select('*, whatsapp_instance(id, name, phone_number, status)')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  if (!data)
    throw createError({ statusCode: 404, statusMessage: 'Conversation not found' })

  const activeAgents = await loadActiveAgentsForConversations(client, tenantId, [data.id as string])

  return {
    data: mapConversationRow(data as any, activeAgents.get(data.id as string) ?? null),
  }
})
