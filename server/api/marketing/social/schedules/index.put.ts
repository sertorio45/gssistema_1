import { readBody } from 'h3'
import { z } from 'zod'

import { recordSocialAudit } from '~/server/utils/social-audit'
import { requireSocialContext } from '~/server/utils/social-context'
import { replacePostSchedules } from '~/server/utils/marketing-schedules'
import { MARKETING_POST_SCHEDULE_STATUSES } from '~/types/marketing-schedules'

const scheduleSchema = z.object({
  id: z.string().uuid().optional(),
  variantId: z.string().uuid().nullable().optional(),
  platform: z.enum(['facebook', 'instagram', 'linkedin']).nullable().optional(),
  format: z.enum(['static', 'carousel', 'video', 'story']).nullable().optional(),
  scheduledAt: z.string().min(1),
  timezone: z.string().min(1).max(80).optional(),
  notes: z.string().max(500).nullable().optional(),
  status: z.enum(MARKETING_POST_SCHEDULE_STATUSES).optional(),
})

const bodySchema = z.object({
  postId: z.string().uuid(),
  tenantId: z.string().uuid().optional(),
  timezone: z.string().min(1).max(80).optional(),
  schedules: z.array(scheduleSchema).max(50),
})

/** Replaces active schedule slots for a post (cancelled slots kept for audit). */
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

  const data = await replacePostSchedules(client, {
    tenantId,
    postId: body.postId,
    userId: user.id,
    schedules: body.schedules,
    timezone: body.timezone,
  })

  await recordSocialAudit(event, client, {
    tenantId,
    actorId: user.id,
    action: 'marketing.schedules.replaced',
    entityType: 'social_post',
    entityId: body.postId,
    after: { count: data.length },
  })

  return { data }
})
