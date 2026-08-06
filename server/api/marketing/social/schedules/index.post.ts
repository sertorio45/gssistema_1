import { readBody } from 'h3'
import { z } from 'zod'

import { recordSocialAudit } from '~/server/utils/social-audit'
import { requireSocialContext } from '~/server/utils/social-context'
import {
  listPostSchedules,
  syncPostNextScheduledAt,
} from '~/server/utils/marketing-schedules'
import { mapMarketingPostSchedule } from '~/types/marketing-schedules'

const bodySchema = z.object({
  postId: z.string().uuid(),
  tenantId: z.string().uuid().optional(),
  variantId: z.string().uuid().nullable().optional(),
  platform: z.enum(['facebook', 'instagram', 'linkedin']).nullable().optional(),
  format: z.enum(['static', 'carousel', 'video', 'story']).nullable().optional(),
  scheduledAt: z.string().min(1),
  timezone: z.string().min(1).max(80).default('America/Sao_Paulo'),
  notes: z.string().max(500).nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const body = bodySchema.parse(await readBody(event))
  const { client, tenantId, user } = await requireSocialContext(
    event,
    'marketing.social.create',
    body.tenantId,
  )

  const { data: post } = await client
    .from('social_posts')
    .select('id')
    .eq('id', body.postId)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .maybeSingle()

  if (!post)
    throw createError({ statusCode: 404, statusMessage: 'Conteúdo não encontrado' })

  const scheduledAt = new Date(body.scheduledAt)
  if (Number.isNaN(scheduledAt.getTime()))
    throw createError({ statusCode: 400, statusMessage: 'Data de agendamento inválida' })

  const { data, error } = await client
    .from('marketing_post_schedules')
    .insert({
      tenant_id: tenantId,
      post_id: body.postId,
      variant_id: body.variantId || null,
      platform: body.platform || null,
      format: body.format || null,
      scheduled_at: scheduledAt.toISOString(),
      timezone: body.timezone,
      notes: body.notes || null,
      status: 'planned',
      created_by: user.id,
    })
    .select('*')
    .single()

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  await syncPostNextScheduledAt(client, tenantId, body.postId)

  await recordSocialAudit(event, client, {
    tenantId,
    actorId: user.id,
    action: 'marketing.schedule.created',
    entityType: 'marketing_post_schedule',
    entityId: data.id,
    after: { post_id: body.postId, scheduled_at: data.scheduled_at },
  })

  return {
    data: mapMarketingPostSchedule(data),
    schedules: await listPostSchedules(client, tenantId, body.postId),
  }
})
