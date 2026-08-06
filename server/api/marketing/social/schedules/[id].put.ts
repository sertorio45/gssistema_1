import { getRouterParam, readBody } from 'h3'
import { z } from 'zod'

import { recordSocialAudit } from '~/server/utils/social-audit'
import { requireSocialContext } from '~/server/utils/social-context'
import {
  listPostSchedules,
  syncPostNextScheduledAt,
} from '~/server/utils/marketing-schedules'
import { mapMarketingPostSchedule, MARKETING_POST_SCHEDULE_STATUSES } from '~/types/marketing-schedules'

const bodySchema = z.object({
  tenantId: z.string().uuid().optional(),
  variantId: z.string().uuid().nullable().optional(),
  platform: z.enum(['facebook', 'instagram', 'linkedin']).nullable().optional(),
  format: z.enum(['static', 'carousel', 'video', 'story']).nullable().optional(),
  scheduledAt: z.string().min(1).optional(),
  timezone: z.string().min(1).max(80).optional(),
  notes: z.string().max(500).nullable().optional(),
  status: z.enum(MARKETING_POST_SCHEDULE_STATUSES).optional(),
})

export default defineEventHandler(async (event) => {
  const scheduleId = String(getRouterParam(event, 'id'))
  const body = bodySchema.parse(await readBody(event))
  const { client, tenantId, user } = await requireSocialContext(
    event,
    'marketing.social.create',
    body.tenantId,
  )

  const { data: existing } = await client
    .from('marketing_post_schedules')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('id', scheduleId)
    .neq('status', 'cancelled')
    .maybeSingle()

  if (!existing)
    throw createError({ statusCode: 404, statusMessage: 'Agendamento não encontrado' })

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (body.variantId !== undefined)
    updatePayload.variant_id = body.variantId
  if (body.platform !== undefined)
    updatePayload.platform = body.platform
  if (body.format !== undefined)
    updatePayload.format = body.format
  if (body.timezone !== undefined)
    updatePayload.timezone = body.timezone
  if (body.notes !== undefined)
    updatePayload.notes = body.notes
  if (body.status !== undefined)
    updatePayload.status = body.status
  if (body.scheduledAt !== undefined) {
    const scheduledAt = new Date(body.scheduledAt)
    if (Number.isNaN(scheduledAt.getTime()))
      throw createError({ statusCode: 400, statusMessage: 'Data de agendamento inválida' })
    updatePayload.scheduled_at = scheduledAt.toISOString()
  }

  const { data, error } = await client
    .from('marketing_post_schedules')
    .update(updatePayload)
    .eq('tenant_id', tenantId)
    .eq('id', scheduleId)
    .select('*')
    .single()

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  await syncPostNextScheduledAt(client, tenantId, existing.post_id)

  await recordSocialAudit(event, client, {
    tenantId,
    actorId: user.id,
    action: 'marketing.schedule.updated',
    entityType: 'marketing_post_schedule',
    entityId: scheduleId,
    after: data,
  })

  return {
    data: mapMarketingPostSchedule(data),
    schedules: await listPostSchedules(client, tenantId, String(existing.post_id)),
  }
})
