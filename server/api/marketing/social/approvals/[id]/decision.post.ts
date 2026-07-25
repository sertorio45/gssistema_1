import { getRouterParam, readBody } from 'h3'
import { z } from 'zod'

import { recordSocialAudit } from '~/server/utils/social-audit'
import { requireSocialContext } from '~/server/utils/social-context'
import { decideApproval } from '~/server/utils/social-workflow'

const schema = z.object({
  decision: z.enum(['approved', 'changes_requested']),
  comment: z.string().max(2000).nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const requestId = String(getRouterParam(event, 'id'))
  const input = schema.parse(await readBody(event))
  const { client, tenantId, user, role } = await requireSocialContext(event, 'marketing.social.approve')
  const isPlatformAdmin = role === 'admin'
    || (user.app_metadata as { role?: string } | undefined)?.role === 'admin'

  const result = await decideApproval(client, {
    tenantId,
    requestId,
    userId: user.id,
    decision: input.decision,
    comment: input.comment,
    isPlatformAdmin,
  })

  await recordSocialAudit(event, client, {
    tenantId,
    actorId: user.id,
    action: `approval.${input.decision}`,
    entityType: 'approval_request',
    entityId: requestId,
    after: { ...result, comment: input.comment || null },
  })

  return { data: result }
})
