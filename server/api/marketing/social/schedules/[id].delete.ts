import { getRouterParam, readBody } from 'h3'
import { z } from 'zod'

import { recordSocialAudit } from '~/server/utils/social-audit'
import { requireSocialContext } from '~/server/utils/social-context'
import {
  listPostSchedules,
  syncPostNextScheduledAt,
} from '~/server/utils/marketing-schedules'

const bodySchema = z.object({
  tenantId: z.string().uuid().optional(),
})

/** Soft-cancels a schedule slot (keeps audit trail). */
export default defineEventHandler(async (event) => {
  const scheduleId = String(getRouterParam(event, 'id'))
  const body = bodySchema.parse(await readBody(event).catch(() => ({})))
  const { client, tenantId, user } = await requireSocialContext(
    event,
    'marketing.social.create',
    body.tenantId,
  )

  const { data: existing } = await client
    .from('marketing_post_schedules')
    .select('id, post_id, status')
    .eq('tenant_id', tenantId)
    .eq('id', scheduleId)
    .maybeSingle()

  if (!existing || existing.status === 'cancelled')
    throw createError({ statusCode: 404, statusMessage: 'Agendamento não encontrado' })

  const { error } = await client
    .from('marketing_post_schedules')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('tenant_id', tenantId)
    .eq('id', scheduleId)

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  await syncPostNextScheduledAt(client, tenantId, existing.post_id)

  await recordSocialAudit(event, client, {
    tenantId,
    actorId: user.id,
    action: 'marketing.schedule.cancelled',
    entityType: 'marketing_post_schedule',
    entityId: scheduleId,
    after: { post_id: existing.post_id },
  })

  return {
    data: { id: scheduleId, cancelled: true },
    schedules: await listPostSchedules(client, tenantId, String(existing.post_id)),
  }
})
