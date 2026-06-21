import { serverSupabaseServiceRole } from '#supabase/server'
import { createError, getQuery, getRouterParam } from 'h3'

import { mapCampaignRow } from '~/composables/whatsapp/useWhatsAppMapper'
import { resolveWhatsAppTenantContext } from '~/server/utils/whatsapp/context'
import { refreshCampaignStats } from '~/server/utils/whatsapp/campaign-service'

const CAMPAIGN_SELECT = `
  *,
  whatsapp_instance:instance_id (name)
`

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, statusMessage: 'id is required' })

  const query = getQuery(event)
  const { tenantId } = await resolveWhatsAppTenantContext(event, query.tenant_id as string | undefined)
  const client = serverSupabaseServiceRole(event)

  const { data: existing } = await client
    .from('whatsapp_campaign')
    .select('id, status')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!existing)
    throw createError({ statusCode: 404, statusMessage: 'Campaign not found' })

  if (existing.status !== 'running') {
    throw createError({ statusCode: 400, statusMessage: 'Campaign is not running' })
  }

  await refreshCampaignStats(client, id, tenantId)

  const { data, error } = await client
    .from('whatsapp_campaign')
    .update({
      status: 'paused',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select(CAMPAIGN_SELECT)
    .single()

  if (error || !data)
    throw createError({ statusCode: 400, statusMessage: error?.message || 'Pause failed' })

  return { data: mapCampaignRow(data as any) }
})
