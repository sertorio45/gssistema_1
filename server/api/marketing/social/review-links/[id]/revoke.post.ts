import { getRouterParam, readBody } from 'h3'
import { z } from 'zod'

import { recordSocialAudit } from '~/server/utils/social-audit'
import { requireSocialContext } from '~/server/utils/social-context'
import { revokeReviewLink } from '~/server/utils/social-review-links'
import { holdsCapability } from '~/constants/workspace'

const schema = z.object({
  tenant_id: z.string().uuid().optional(),
})

export default defineEventHandler(async (event) => {
  const linkId = String(getRouterParam(event, 'id'))
  const input = schema.parse(await readBody(event) || {})
  const { client, tenantId, user, workspace, isPlatformStaff } = await requireSocialContext(
    event,
    'marketing.social.review_link.revoke',
    input.tenant_id,
  )

  if (
    !isPlatformStaff
    && !holdsCapability(workspace.capabilities, 'marketing.social.review_link.revoke')
    && !holdsCapability(workspace.capabilities, 'marketing.social.manage')
  ) {
    throw createError({ statusCode: 403, statusMessage: 'Sem permissão para revogar link mágico' })
  }

  const result = await revokeReviewLink(client, {
    tenantId,
    linkId,
    userId: user.id,
  })

  await recordSocialAudit(event, client, {
    tenantId,
    actorId: user.id,
    action: 'review_link.revoked',
    entityType: 'social_review_link',
    entityId: linkId,
    after: { revoked: true },
  })

  return { data: result }
})
