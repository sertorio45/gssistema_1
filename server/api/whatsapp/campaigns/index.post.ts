import { serverSupabaseServiceRole } from '#supabase/server'
import { createError, readBody } from 'h3'

import { mapCampaignRow } from '~/composables/whatsapp/useWhatsAppMapper'
import type { CreateWhatsAppCampaignPayload } from '~/types/whatsapp'
import { resolveWhatsAppTenantContext } from '~/server/utils/whatsapp/context'

const CAMPAIGN_SELECT = `
  *,
  whatsapp_instance:instance_id (name)
`

export default defineEventHandler(async (event) => {
  const body = await readBody<CreateWhatsAppCampaignPayload>(event)
  const { tenantId } = await resolveWhatsAppTenantContext(event, body.tenant_id)

  if (!body.name?.trim())
    throw createError({ statusCode: 400, statusMessage: 'name is required' })

  if (!body.instance_id)
    throw createError({ statusCode: 400, statusMessage: 'instance_id is required' })

  if (!body.audience_filter?.message?.trim())
    throw createError({ statusCode: 400, statusMessage: 'message is required' })

  const client = serverSupabaseServiceRole(event)

  const { data: instance } = await client
    .from('whatsapp_instance')
    .select('id, provider, status')
    .eq('id', body.instance_id)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!instance)
    throw createError({ statusCode: 404, statusMessage: 'Instance not found' })

  if (instance.provider !== 'evolution') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Campanhas disponíveis apenas para instâncias Evolution API',
    })
  }

  const audienceFilter = {
    message: body.audience_filter.message.trim(),
    audience_type: body.audience_filter.audience_type || 'all',
    opt_in_only: body.audience_filter.opt_in_only ?? true,
    exclude_blocked: body.audience_filter.exclude_blocked ?? true,
    tags: body.audience_filter.tags || [],
    contact_ids: body.audience_filter.contact_ids || [],
  }

  const { data, error } = await client
    .from('whatsapp_campaign')
    .insert({
      tenant_id: tenantId,
      instance_id: body.instance_id,
      name: body.name.trim(),
      status: 'draft',
      scheduled_at: body.scheduled_at || null,
      audience_filter: audienceFilter,
      stats: { total: 0, sent: 0, failed: 0, pending: 0, skipped: 0 },
    })
    .select(CAMPAIGN_SELECT)
    .single()

  if (error || !data)
    throw createError({ statusCode: 400, statusMessage: error?.message || 'Failed to create campaign' })

  return { data: mapCampaignRow(data as any) }
})
