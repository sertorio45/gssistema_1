import { getRouterParam, readBody } from 'h3'
import { z } from 'zod'

import { recordSocialAudit } from '~/server/utils/social-audit'
import { requireSocialContext } from '~/server/utils/social-context'
import { syncPostNextScheduledAt } from '~/server/utils/marketing-schedules'

const bodySchema = z.object({
  scheduledAt: z.string().datetime({ offset: true }),
  /** When set, moves a specific multi-date slot; otherwise updates the next active slot / legacy post date. */
  scheduleId: z.string().uuid().optional(),
})

/**
 * Calendar drag/drop reschedule: updates schedule slot (or legacy scheduled_at)
 * without creating a content revision.
 */
export default defineEventHandler(async (event) => {
  const postId = String(getRouterParam(event, 'id'))
  const body = bodySchema.parse(await readBody(event))
  const { client, tenantId, user } = await requireSocialContext(event, 'marketing.social.schedule')

  const { data: post } = await client
    .from('social_posts')
    .select('id, status, publication_status, deleted_at, scheduled_at')
    .eq('id', postId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!post || post.deleted_at)
    throw createError({ statusCode: 404, statusMessage: 'Publicação não encontrada' })

  if (['publishing', 'published'].includes(String(post.status))
    || ['publishing', 'published', 'partially_published', 'deletion_pending', 'deleted'].includes(String(post.publication_status || ''))) {
    throw createError({ statusCode: 409, statusMessage: 'Não é possível remarcar uma publicação já enviada' })
  }

  let scheduleId = body.scheduleId || null

  if (scheduleId) {
    const { data: schedule, error: scheduleError } = await client
      .from('marketing_post_schedules')
      .update({
        scheduled_at: body.scheduledAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', scheduleId)
      .eq('tenant_id', tenantId)
      .eq('post_id', postId)
      .neq('status', 'cancelled')
      .select('id, scheduled_at')
      .maybeSingle()

    if (scheduleError)
      throw createError({ statusCode: 400, statusMessage: scheduleError.message })
    if (!schedule)
      throw createError({ statusCode: 404, statusMessage: 'Agendamento não encontrado' })
  }
  else {
    const { data: nextSlot } = await client
      .from('marketing_post_schedules')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('post_id', postId)
      .in('status', ['planned', 'queued', 'failed'])
      .order('scheduled_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (nextSlot?.id) {
      scheduleId = String(nextSlot.id)
      await client
        .from('marketing_post_schedules')
        .update({
          scheduled_at: body.scheduledAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', nextSlot.id)
        .eq('tenant_id', tenantId)
    }
    else {
      const { data: created, error: createError } = await client
        .from('marketing_post_schedules')
        .insert({
          tenant_id: tenantId,
          post_id: postId,
          scheduled_at: body.scheduledAt,
          status: 'planned',
          created_by: user.id,
        })
        .select('id')
        .single()
      if (createError)
        throw createError({ statusCode: 400, statusMessage: createError.message })
      scheduleId = String(created.id)
    }
  }

  await syncPostNextScheduledAt(client, tenantId, postId)

  const { data, error } = await client
    .from('social_posts')
    .select('id, scheduled_at')
    .eq('id', postId)
    .eq('tenant_id', tenantId)
    .single()

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  await client
    .from('publication_jobs')
    .update({ scheduled_at: body.scheduledAt })
    .eq('tenant_id', tenantId)
    .eq('post_id', postId)
    .in('status', ['pending', 'retrying'])

  await recordSocialAudit(event, client, {
    tenantId,
    actorId: user.id,
    action: 'social_post.calendar_rescheduled',
    entityType: 'social_post',
    entityId: postId,
    before: { scheduled_at: post.scheduled_at },
    after: { scheduled_at: body.scheduledAt, schedule_id: scheduleId },
  })

  return { data: { ...data, schedule_id: scheduleId } }
})
