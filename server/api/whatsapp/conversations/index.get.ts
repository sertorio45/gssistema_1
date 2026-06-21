import { serverSupabaseServiceRole } from '#supabase/server'
import { createError, getQuery } from 'h3'

import { mapConversationRow } from '~/composables/whatsapp/useWhatsAppMapper'
import { resolveWhatsAppTenantContext } from '~/server/utils/whatsapp/context'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const { tenantId } = await resolveWhatsAppTenantContext(event, query.tenant_id as string | undefined)

  const status = query.status as string | undefined
  const search = (query.search as string | undefined)?.trim()
  const unreadOnly = query.unread_only === 'true'
  const limit = Math.min(Number(query.limit) || 50, 100)

  const client = serverSupabaseServiceRole(event)

  let req = client
    .from('whatsapp_conversation')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(limit)

  if (status && status !== 'all')
    req = req.eq('status', status)

  if (unreadOnly)
    req = req.gt('unread_count', 0)

  if (search) {
    req = req.or(
      `contact_name.ilike.%${search}%,contact_phone.ilike.%${search}%,last_message_preview.ilike.%${search}%`,
    )
  }

  const { data, error } = await req

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  return {
    data: (data || []).map(row => mapConversationRow(row as any)),
  }
})
