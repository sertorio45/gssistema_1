import { getRouterParam, readBody } from 'h3'
import { z } from 'zod'

import { submitApprovalDecision } from '~/server/utils/social-approval-domain'
import { assertDecisionConflict } from '~/server/utils/social-approval-ux'
import { recordSocialAudit } from '~/server/utils/social-audit'
import { requireSocialContext } from '~/server/utils/social-context'

const schema = z.object({
  decision: z.enum(['approved', 'changes_requested', 'rejected']),
  comment: z.string().max(2000).nullable().optional(),
  changeCategory: z.enum(['art', 'copy', 'date', 'platform', 'incorrect_info', 'other']).nullable().optional(),
  tenant_id: z.string().uuid().optional(),
})

export default defineEventHandler(async (event) => {
  const requestId = String(getRouterParam(event, 'id'))
  const input = schema.parse(await readBody(event))
  const { client, tenantId, user, workspace, isPlatformStaff } = await requireSocialContext(
    event,
    'marketing.social.approve',
    input.tenant_id,
  )

  try {
    const result = await submitApprovalDecision(client, {
      tenantId,
      requestId,
      userId: user.id,
      decision: input.decision,
      comment: input.comment,
      changeCategory: input.changeCategory,
      isPlatformAdmin: isPlatformStaff,
      capabilities: [...workspace.capabilities],
    })

    await recordSocialAudit(event, client, {
      tenantId,
      actorId: user.id,
      action: `approval.${input.decision}`,
      entityType: 'approval_request',
      entityId: requestId,
      after: {
        ...result,
        comment: input.comment || null,
        changeCategory: input.changeCategory || null,
      },
    })

    return { data: result }
  }
  catch (error: any) {
    assertDecisionConflict(error)
    throw error
  }
})
