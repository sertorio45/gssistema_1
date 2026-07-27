import { getRouterParam, readBody } from 'h3'
import { z } from 'zod'

import { recordSocialAudit } from '~/server/utils/social-audit'
import { requireSocialContext } from '~/server/utils/social-context'

const bodySchema = z.object({
  scheduledAt: z.string().datetime({ offset: true }),
})

/**
 * Calendar drag/drop reschedule: updates scheduled_at without creating a content revision.
 * Only for posts that are not yet publishing/published/deleted.
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

  const { data, error } = await client
    .from('social_posts')
    .update({
      scheduled_at: body.scheduledAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', postId)
    .eq('tenant_id', tenantId)
    .select('id, scheduled_at')
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
    after: { scheduled_at: body.scheduledAt },
  })

  return { data }
})
