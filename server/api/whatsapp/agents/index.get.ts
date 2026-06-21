import { serverSupabaseServiceRole } from '#supabase/server'
import { createError, getQuery } from 'h3'

import { mapAgentRow } from '~/composables/whatsapp/useWhatsAppMapper'
import { resolveWhatsAppTenantContext } from '~/server/utils/whatsapp/context'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const { tenantId } = await resolveWhatsAppTenantContext(event, query.tenant_id as string | undefined)
  const client = serverSupabaseServiceRole(event)

  const { data, error } = await client
    .from('whatsapp_agent')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('name', { ascending: true })

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  return { data: (data || []).map(mapAgentRow) }
})
