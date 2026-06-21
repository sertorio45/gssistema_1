import { createError, getQuery } from 'h3'

import { mapMessageRow } from '~/composables/whatsapp/useWhatsAppMapper'
import { resolveWhatsAppTenantContext } from '~/server/utils/whatsapp/context'
import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const conversationId = getRouterParam(event, 'id')
  if (!conversationId)
    throw createError({ statusCode: 400, statusMessage: 'id is required' })

  const query = getQuery(event)
  const { tenantId } = await resolveWhatsAppTenantContext(event, query.tenant_id as string | undefined)
  const limit = Math.min(Number(query.limit) || 100, 200)
  const before = query.before as string | undefined

  const client = serverSupabaseServiceRole(event)

  const { data: conversation } = await client
    .from('whatsapp_conversation')
    .select('id')
    .eq('id', conversationId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!conversation)
    throw createError({ statusCode: 404, statusMessage: 'Conversation not found' })

  let req = client
    .from('whatsapp_message')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('conversation_id', conversationId)
    .order('sent_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })
    .limit(limit)

  if (before)
    req = req.lt('sent_at', before)

  const { data, error } = await req

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  return {
    data: (data || []).map(row => mapMessageRow(row as any)),
  }
})
