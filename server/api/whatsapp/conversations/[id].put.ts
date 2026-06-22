import { createError, readBody } from 'h3'

import { mapConversationRow } from '~/composables/whatsapp/useWhatsAppMapper'
import { loadActiveAgentsForConversations } from '~/server/utils/whatsapp/conversation-agent-meta'
import { resolveWhatsAppTenantContext } from '~/server/utils/whatsapp/context'
import { serverSupabaseServiceRole } from '#supabase/server'

interface UpdateConversationBody {
  tenant_id?: string
  status?: 'open' | 'pending' | 'resolved' | 'spam'
  assigned_to?: string | null
  mark_read?: boolean
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, statusMessage: 'id is required' })

  const body = await readBody<UpdateConversationBody>(event)
  const { tenantId } = await resolveWhatsAppTenantContext(event, body.tenant_id)
  const client = serverSupabaseServiceRole(event)

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (body.status)
    update.status = body.status
  if (body.assigned_to !== undefined)
    update.assigned_to = body.assigned_to
  if (body.mark_read)
    update.unread_count = 0

  const { data, error } = await client
    .from('whatsapp_conversation')
    .update(update)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select('*')
    .single()

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  const activeAgents = await loadActiveAgentsForConversations(client, tenantId, [id])

  return {
    data: mapConversationRow(data as any, activeAgents.get(id) ?? null),
  }
})
