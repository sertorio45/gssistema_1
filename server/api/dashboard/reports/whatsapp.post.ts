import { serverSupabaseServiceRole } from '#supabase/server'

import { createError, defineEventHandler, readBody } from 'h3'

import { resolveDashboardTenantContext } from '~/server/utils/dashboard'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { tenantId, user } = await resolveDashboardTenantContext(event, body?.tenant_id)
  const client = await serverSupabaseServiceRole(event)

  if (!body?.phone_number) {
    throw createError({ statusCode: 400, statusMessage: 'phone_number is required' })
  }

  const reportPayload = {
    period: body.period || 'last_30_days',
    source: body.source || 'all',
    summary: body.summary || null,
  }

  const { data, error } = await client
    .from('dashboard_report_logs')
    .insert({
      tenant_id: tenantId,
      channel: 'whatsapp',
      destination: body.phone_number,
      payload: reportPayload,
      status: 'queued',
      created_by: user.id,
    })
    .select('*')
    .single()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  // TODO: Integrate with provider like Evolution API for real delivery.
  return {
    data,
    message: 'Report queued for WhatsApp delivery',
  }
})
