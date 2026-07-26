import { createError, getRouterParam, readBody } from 'h3'
import { z } from 'zod'

import { holdsCapability } from '~/constants/workspace'
import { startApprovalWorkflow } from '~/server/utils/social-approval-domain'
import { listEligibleSocialApprovers } from '~/server/utils/social-approvers'
import { recordSocialAudit } from '~/server/utils/social-audit'
import { requireSocialContext } from '~/server/utils/social-context'

const schema = z.object({
  approverIds: z.array(z.string().uuid()).max(100).default([]),
  dueAt: z.string().datetime({ offset: true }).nullable().optional(),
  workflowId: z.string().uuid().nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const postId = String(getRouterParam(event, 'id'))
  const input = schema.parse(await readBody(event))
  const context = await requireSocialContext(event, 'marketing.social.read')

  const capabilities = context.workspace.capabilities
  const canSubmit = context.isPlatformStaff
    || holdsCapability(capabilities, 'marketing.social.approval.submit')
    || holdsCapability(capabilities, 'marketing.social.create')
  if (!canSubmit)
    throw createError({ statusCode: 403, statusMessage: 'Sem permissão para enviar para aprovação' })

  // Explicit approvers picked in the UI are validated against the eligible set.
  let approverIds = [...new Set(input.approverIds.filter(Boolean))]
  if (approverIds.length) {
    const eligible = await listEligibleSocialApprovers(context.client, context.tenantId)
    const allowed = new Set(eligible.map(approver => approver.userId))
    if (approverIds.some(id => !allowed.has(id))) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Um dos usuários selecionados não possui permissão para aprovar',
      })
    }
  }

  const result = await startApprovalWorkflow(context.client, {
    tenantId: context.tenantId,
    postId,
    userId: context.user.id,
    approverIds,
    dueAt: input.dueAt,
    workflowId: input.workflowId,
    capabilities: [...capabilities],
    isPlatformStaff: context.isPlatformStaff,
  })

  await recordSocialAudit(event, context.client, {
    tenantId: context.tenantId,
    actorId: context.user.id,
    action: result.mode === 'no_approval' ? 'social_post.auto_approved' : 'social_post.submitted',
    entityType: result.request ? 'approval_request' : 'social_post',
    entityId: result.request?.id || postId,
    after: { mode: result.mode, workflowId: result.workflowId, versionId: result.versionId },
  })

  return { data: result.request, meta: { mode: result.mode, workflowId: result.workflowId } }
})
