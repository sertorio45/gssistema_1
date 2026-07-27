import { getRouterParam, readBody, getRequestURL } from 'h3'
import { z } from 'zod'

import { recordSocialAudit } from '~/server/utils/social-audit'
import { requireSocialContext } from '~/server/utils/social-context'
import {
  createReviewLink,
  DEFAULT_REVIEW_ACTIONS,
} from '~/server/utils/social-review-links'
import { holdsCapability } from '~/constants/workspace'

const schema = z.object({
  tenant_id: z.string().uuid().optional(),
  expiresInHours: z.number().int().min(1).max(720).optional(),
  maxUses: z.number().int().min(1).max(1000).nullable().optional(),
  allowedActions: z.array(z.enum(['approve', 'changes_requested', 'reject', 'comment'])).optional(),
  afterDecision: z.enum(['read_only', 'invalidate']).optional(),
  requireEmailConfirm: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  const requestId = String(getRouterParam(event, 'id'))
  const input = schema.parse(await readBody(event) || {})
  const { client, tenantId, user, workspace, isPlatformStaff } = await requireSocialContext(
    event,
    'marketing.social.review_link.create',
    input.tenant_id,
  )

  if (
    !isPlatformStaff
    && !holdsCapability(workspace.capabilities, 'marketing.social.review_link.create')
    && !holdsCapability(workspace.capabilities, 'marketing.social.manage')
  ) {
    throw createError({ statusCode: 403, statusMessage: 'Sem permissão para gerar link mágico' })
  }

  const created = await createReviewLink(client, {
    tenantId,
    organizationId: workspace.organization?.id || null,
    approvalRequestId: requestId,
    userId: user.id,
    expiresInHours: input.expiresInHours,
    maxUses: input.maxUses,
    allowedActions: input.allowedActions?.length ? input.allowedActions : DEFAULT_REVIEW_ACTIONS,
    afterDecision: input.afterDecision,
    requireEmailConfirm: input.requireEmailConfirm,
  })

  const origin = getRequestURL(event).origin
  const url = `${origin}${created.path}`

  await recordSocialAudit(event, client, {
    tenantId,
    actorId: user.id,
    action: 'review_link.created',
    entityType: 'social_review_link',
    entityId: created.id,
    after: {
      approvalRequestId: requestId,
      expiresAt: created.expiresAt,
      allowedActions: created.allowedActions,
      afterDecision: created.afterDecision,
      // Never audit the plaintext token.
    },
  })

  return {
    data: {
      id: created.id,
      url,
      path: created.path,
      expiresAt: created.expiresAt,
      allowedActions: created.allowedActions,
      afterDecision: created.afterDecision,
      requireEmailConfirm: created.requireEmailConfirm,
      maxUses: created.maxUses,
      // Plaintext token only in this response.
      token: created.token,
    },
  }
})
