import { readBody } from 'h3'
import { z } from 'zod'

import { recordSocialAudit } from '~/server/utils/social-audit'
import { requireSocialContext } from '~/server/utils/social-context'
import { moveProductionCard } from '~/server/utils/social-production'
import { SOCIAL_PRODUCTION_STATUSES } from '~/types/marketing-social'

const bodySchema = z.object({
  postId: z.string().uuid(),
  tenantId: z.string().uuid().optional(),
  toStatus: z.enum(SOCIAL_PRODUCTION_STATUSES),
  blockedReason: z.string().trim().max(500).nullable().optional(),
  note: z.string().trim().max(500).nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const body = bodySchema.parse(await readBody(event))
  const { client, tenantId, user, workspace, isPlatformStaff } = await requireSocialContext(
    event,
    'marketing.social.production.move',
    body.tenantId,
  )

  const canManage = isPlatformStaff
    || workspace.has('marketing.social.production.manage')
    || workspace.has('marketing.social.manage')

  if (!canManage && body.toStatus === 'blocked') {
    // Moving to blocked is allowed with move cap; reason still required by domain.
  }

  const result = await moveProductionCard(client, {
    postId: body.postId,
    tenantId,
    toStatus: body.toStatus,
    blockedReason: body.blockedReason,
    note: body.note,
    userId: user.id,
  })

  await recordSocialAudit(event, client, {
    tenantId,
    actorId: user.id,
    action: 'production.moved',
    entityType: 'social_post',
    entityId: body.postId,
    after: result,
  })

  return { data: result }
})
