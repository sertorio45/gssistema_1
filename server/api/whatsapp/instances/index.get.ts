import { serverSupabaseServiceRole } from '#supabase/server'
import { getQuery } from 'h3'

import { resolveWhatsAppTenantContext, sanitizeInstanceRow } from '~/server/utils/whatsapp/context'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const { tenantId } = await resolveWhatsAppTenantContext(event, query.tenant_id as string | undefined)
  const client = serverSupabaseServiceRole(event)

  const { data: instances, error } = await client
    .from('whatsapp_instance')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (error) {
    throw createError({ statusCode: 400, statusMessage: error.message })
  }

  const instanceIds = (instances || []).map(i => i.id)
  let integrations: Record<string, any>[] = []

  if (instanceIds.length) {
    const { data } = await client
      .from('whatsapp_integration')
      .select('*')
      .in('instance_id', instanceIds)
    integrations = data || []
  }

  const integrationMap = new Map(integrations.map(i => [i.instance_id, i]))

  return {
    data: (instances || []).map(row => sanitizeInstanceRow(row, integrationMap.get(row.id) || null)),
  }
})
