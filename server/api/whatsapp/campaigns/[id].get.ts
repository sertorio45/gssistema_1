import { serverSupabaseServiceRole } from '#supabase/server'
import { createError, getQuery } from 'h3'

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

  const { data, error } = await client
    .from('whatsapp_campaign')
    .select(CAMPAIGN_SELECT)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (error || !data)
    throw createError({ statusCode: 404, statusMessage: 'Campaign not found' })

  if (['running', 'scheduled'].includes(data.status)) {
    await refreshCampaignStats(client, id, tenantId)
    const { data: refreshed } = await client
      .from('whatsapp_campaign')
      .select(CAMPAIGN_SELECT)
      .eq('id', id)
      .maybeSingle()
    if (refreshed)
      return { data: mapCampaignRow(refreshed as any) }
  }

  return { data: mapCampaignRow(data as any) }
})
