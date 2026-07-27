import { readBody } from 'h3'
import { z } from 'zod'

import { submitBatchApprovalDecisions } from '~/server/utils/social-approval-domain'
import { recordSocialAudit } from '~/server/utils/social-audit'
import { requireSocialContext } from '~/server/utils/social-context'

const itemSchema = z.object({
  requestId: z.string().uuid(),
  decision: z.enum(['approved', 'changes_requested', 'rejected']),
  comment: z.string().max(2000).nullable().optional(),
  changeCategory: z.enum(['art', 'copy', 'date', 'platform', 'incorrect_info', 'other']).nullable().optional(),
})

const schema = z.object({
  tenant_id: z.string().uuid().optional(),
  items: z.array(itemSchema).min(1).max(50),
})

export default defineEventHandler(async (event) => {
  const input = schema.parse(await readBody(event))
  const { client, tenantId, user, workspace, isPlatformStaff } = await requireSocialContext(
    event,
    'marketing.social.approve',
    input.tenant_id,
  )

  const result = await submitBatchApprovalDecisions(client, {
    tenantId,
    userId: user.id,
    items: input.items,
    capabilities: [...workspace.capabilities],
    isPlatformAdmin: isPlatformStaff,
  })

  await recordSocialAudit(event, client, {
    tenantId,
    actorId: user.id,
    action: 'approval.batch_decision',
    entityType: 'approval_request',
    entityId: tenantId,
    after: {
      total: result.total,
      succeeded: result.succeeded,
      failed: result.failed,
      results: result.results.map(row => ({
        requestId: row.requestId,
        ok: row.ok,
        status: row.status || null,
        statusCode: row.statusCode || null,
      })),
    },
  })

  return { data: result }
})
