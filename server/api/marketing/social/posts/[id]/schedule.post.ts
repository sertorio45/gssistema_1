import { getRouterParam, readBody } from 'h3'
import { z } from 'zod'

import { recordSocialAudit } from '~/server/utils/social-audit'
import { requireSocialContext } from '~/server/utils/social-context'
import { enqueueApprovedPost } from '~/server/utils/social-workflow'

const schema = z.object({
  scheduledAt: z.string().datetime({ offset: true }).nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const postId = String(getRouterParam(event, 'id'))
  const input = schema.parse(await readBody(event))
  const { client, tenantId, user } = await requireSocialContext(event, 'marketing.social.publish')

  const jobs = await enqueueApprovedPost(client, {
    tenantId,
    postId,
    scheduledAt: input.scheduledAt,
  })

  await recordSocialAudit(event, client, {
    tenantId,
    actorId: user.id,
    action: 'social_post.scheduled',
    entityType: 'social_post',
    entityId: postId,
    after: { jobIds: jobs.map((job: any) => job.id), scheduledAt: input.scheduledAt },
  })

  return { data: jobs }
})
