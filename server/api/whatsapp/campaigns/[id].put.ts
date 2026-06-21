import { serverSupabaseServiceRole } from '#supabase/server'
import { createError, getRouterParam, readBody } from 'h3'

import { mapCampaignRow } from '~/composables/whatsapp/useWhatsAppMapper'
import type { UpdateWhatsAppCampaignPayload } from '~/types/whatsapp'
import { resolveWhatsAppTenantContext } from '~/server/utils/whatsapp/context'

const CAMPAIGN_SELECT = `
  *,
  whatsapp_instance:instance_id (name)
`

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, statusMessage: 'id is required' })

  const body = await readBody<UpdateWhatsAppCampaignPayload>(event)
  const { tenantId } = await resolveWhatsAppTenantContext(event, body.tenant_id)
  const client = serverSupabaseServiceRole(event)

  const { data: existing } = await client
    .from('whatsapp_campaign')
    .select('id, status')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!existing)
    throw createError({ statusCode: 404, statusMessage: 'Campaign not found' })

  if (!['draft', 'paused'].includes(existing.status)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Only draft or paused campaigns can be edited',
    })
  }

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (body.name?.trim())
    updatePayload.name = body.name.trim()

  if (body.instance_id)
    updatePayload.instance_id = body.instance_id

  if (body.scheduled_at !== undefined)
    updatePayload.scheduled_at = body.scheduled_at

  if (body.audience_filter) {
    if (!body.audience_filter.message?.trim()) {
      throw createError({ statusCode: 400, statusMessage: 'message is required' })
    }
    updatePayload.audience_filter = {
      message: body.audience_filter.message.trim(),
      audience_type: body.audience_filter.audience_type || 'all',
      opt_in_only: body.audience_filter.opt_in_only ?? true,
      exclude_blocked: body.audience_filter.exclude_blocked ?? true,
      tags: body.audience_filter.tags || [],
      contact_ids: body.audience_filter.contact_ids || [],
    }
  }

  const { data, error } = await client
    .from('whatsapp_campaign')
    .update(updatePayload)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select(CAMPAIGN_SELECT)
    .single()

  if (error || !data)
    throw createError({ statusCode: 400, statusMessage: error?.message || 'Update failed' })

  return { data: mapCampaignRow(data as any) }
})
