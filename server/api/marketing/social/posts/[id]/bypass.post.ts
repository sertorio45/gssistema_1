import { createError, getRouterParam, readBody } from 'h3'
import { z } from 'zod'

import { holdsCapability } from '~/constants/workspace'
import { bypassApproval } from '~/server/utils/social-approval-domain'
import { recordSocialAudit } from '~/server/utils/social-audit'
import { requireSocialContext } from '~/server/utils/social-context'

const schema = z.object({
  justification: z.string().trim().min(5).max(2000),
})

export default defineEventHandler(async (event) => {
  const postId = String(getRouterParam(event, 'id'))
  const input = schema.parse(await readBody(event))
  const context = await requireSocialContext(event, 'marketing.social.read')

  const capabilities = context.workspace.capabilities
  if (!context.isPlatformStaff && !holdsCapability(capabilities, 'marketing.social.approval.bypass'))
    throw createError({ statusCode: 403, statusMessage: 'Sem permissão para ignorar a aprovação' })

  const result = await bypassApproval(context.client, {
    tenantId: context.tenantId,
    postId,
    userId: context.user.id,
    justification: input.justification,
    capabilities: [...capabilities],
    isPlatformStaff: context.isPlatformStaff,
  })

  await recordSocialAudit(event, context.client, {
    tenantId: context.tenantId,
    actorId: context.user.id,
    action: 'social_post.approval_bypassed',
    entityType: 'social_post',
    entityId: postId,
    after: { versionId: result.versionId, reason: result.reason },
  })

  return { data: result }
})
