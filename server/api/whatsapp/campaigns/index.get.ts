import { serverSupabaseServiceRole } from '#supabase/server'
import { createError, getQuery } from 'h3'

import { mapCampaignRow } from '~/composables/whatsapp/useWhatsAppMapper'
import { resolveWhatsAppTenantContext } from '~/server/utils/whatsapp/context'

const CAMPAIGN_SELECT = `
  *,
  whatsapp_instance:instance_id (name)
`

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const { tenantId } = await resolveWhatsAppTenantContext(event, query.tenant_id as string | undefined)

  const status = (query.status as string | undefined)?.trim()
  const search = (query.search as string | undefined)?.trim()
  const page = Math.max(Number(query.page) || 1, 1)
  const limit = Math.min(Number(query.limit) || 20, 100)
  const from = (page - 1) * limit
  const to = from + limit - 1

  const client = serverSupabaseServiceRole(event)

  let req = client
    .from('whatsapp_campaign')
    .select(CAMPAIGN_SELECT, { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (status && status !== 'all')
    req = req.eq('status', status)

  if (search)
    req = req.ilike('name', `%${search}%`)

  const { data, error, count } = await req

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  return {
    data: (data || []).map(row => mapCampaignRow(row as any)),
    total: count || 0,
    page,
    limit,
  }
})
