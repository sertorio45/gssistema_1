import { getRouterParam, readBody } from 'h3'
import { z } from 'zod'

import { recordSocialAudit } from '~/server/utils/social-audit'
import { requireSocialContext } from '~/server/utils/social-context'
import { submitPostForApproval } from '~/server/utils/social-workflow'

const schema = z.object({
  approverIds: z.array(z.string().uuid()).min(1).max(100),
  dueAt: z.string().datetime({ offset: true }).nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const postId = getRouterParam(event, 'id')
  const input = schema.parse(await readBody(event))
  const { client, tenantId, user } = await requireSocialContext(event, 'marketing.social.create')

  const request = await submitPostForApproval(client, {
    tenantId,
    postId: String(postId),
    userId: user.id,
    approverIds: input.approverIds,
    dueAt: input.dueAt,
  })

  await recordSocialAudit(event, client, {
    tenantId,
    actorId: user.id,
    action: 'social_post.submitted',
    entityType: 'approval_request',
    entityId: request.id,
    after: request,
  })

  return { data: request }
})
