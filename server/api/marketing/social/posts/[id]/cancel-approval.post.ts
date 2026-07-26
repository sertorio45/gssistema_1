import { getRouterParam, readBody } from 'h3'
import { z } from 'zod'

import { cancelApprovalRun } from '~/server/utils/social-approval-domain'
import { recordSocialAudit } from '~/server/utils/social-audit'
import { requireSocialContext } from '~/server/utils/social-context'

const schema = z.object({
  tenant_id: z.string().uuid().optional(),
  reason: z.string().trim().max(1000).nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const postId = String(getRouterParam(event, 'id'))
  const input = schema.parse(await readBody(event) || {})
  // Authn + tenant gate first; cancel itself requires manage/workflow (not submit).
  const { client, tenantId, user, workspace, isPlatformStaff } = await requireSocialContext(
    event,
    'marketing.social.read',
    input.tenant_id,
  )
  const { holdsCapability } = await import('~/constants/workspace')
  const canCancel = isPlatformStaff
    || holdsCapability(workspace.capabilities, 'marketing.social.workflow.manage')
    || holdsCapability(workspace.capabilities, 'marketing.social.manage')
  if (!canCancel)
    throw createError({ statusCode: 403, statusMessage: 'Sem permissão para cancelar aprovação' })

  await cancelApprovalRun(client, { tenantId, postId })

  await recordSocialAudit(event, client, {
    tenantId,
    actorId: user.id,
    action: 'approval.cancelled',
    entityType: 'social_post',
    entityId: postId,
    after: { reason: input.reason || null },
  })

  return { data: { postId, status: 'cancelled' } }
})
