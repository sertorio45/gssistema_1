import { serverSupabaseServiceRole } from '#supabase/server'
import { createError, getQuery, getRouterParam } from 'h3'

import { mapCampaignRecipientRow } from '~/composables/whatsapp/useWhatsAppMapper'
import { resolveWhatsAppTenantContext } from '~/server/utils/whatsapp/context'

const RECIPIENT_SELECT = `
  *,
  whatsapp_contact:contact_id (name)
`

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, statusMessage: 'id is required' })

  const query = getQuery(event)
  const { tenantId } = await resolveWhatsAppTenantContext(event, query.tenant_id as string | undefined)

  const status = (query.status as string | undefined)?.trim()
  const page = Math.max(Number(query.page) || 1, 1)
  const limit = Math.min(Number(query.limit) || 50, 200)
  const from = (page - 1) * limit
  const to = from + limit - 1

  const client = serverSupabaseServiceRole(event)

  const { data: campaign } = await client
    .from('whatsapp_campaign')
    .select('id')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!campaign)
    throw createError({ statusCode: 404, statusMessage: 'Campaign not found' })

  let req = client
    .from('whatsapp_campaign_recipient')
    .select(RECIPIENT_SELECT, { count: 'exact' })
    .eq('campaign_id', id)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true })
    .range(from, to)

  if (status && status !== 'all')
    req = req.eq('status', status)

  const { data, error, count } = await req

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  return {
    data: (data || []).map(row => mapCampaignRecipientRow(row as any)),
    total: count || 0,
    page,
    limit,
  }
})
