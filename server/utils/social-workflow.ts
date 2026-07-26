import { createError } from 'h3'

import { listEligibleSocialApprovers } from '~/server/utils/social-approvers'
import {
  buildSocialPostSnapshot,
  createContentVersion,
  enqueueApprovedPost,
  startApprovalWorkflow,
  submitApprovalDecision,
} from '~/server/utils/social-approval-domain'

/**
 * Backward-compatible surface for the marketing social approval flow.
 *
 * The real logic now lives in `social-approval-domain`. These wrappers keep the
 * historical signatures used by older endpoints/tests while delegating to the
 * domain service so there is a single source of truth.
 */

export { buildSocialPostSnapshot, createContentVersion, enqueueApprovedPost }

/** Validates the picked approvers against the tenant's eligible approver set. */
async function assertApproversEligible(client: any, tenantId: string, approverIds: string[]) {
  const uniqueApproverIds = [...new Set(approverIds.filter(Boolean))]
  if (!uniqueApproverIds.length)
    throw createError({ statusCode: 400, statusMessage: 'Selecione ao menos um aprovador' })

  const eligibleApprovers = await listEligibleSocialApprovers(client, tenantId)
  const allowedApprovers = new Set(eligibleApprovers.map(approver => approver.userId))
  if (uniqueApproverIds.some(userId => !allowedApprovers.has(userId))) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Um dos usuários selecionados não possui permissão para aprovar',
    })
  }
  return uniqueApproverIds
}

export async function submitPostForApproval(
  client: any,
  input: {
    tenantId: string
    postId: string
    userId: string
    approverIds: string[]
    dueAt?: string | null
    workflowId?: string | null
    capabilities?: string[]
    isPlatformStaff?: boolean
  },
) {
  const approverIds = await assertApproversEligible(client, input.tenantId, input.approverIds)

  const result = await startApprovalWorkflow(client, {
    tenantId: input.tenantId,
    postId: input.postId,
    userId: input.userId,
    approverIds,
    dueAt: input.dueAt,
    workflowId: input.workflowId,
    capabilities: input.capabilities,
    isPlatformStaff: input.isPlatformStaff,
  })

  return result.request
}

export async function decideApproval(
  client: any,
  input: {
    tenantId: string
    requestId: string
    userId: string
    decision: 'approved' | 'changes_requested' | 'rejected'
    comment?: string | null
    isPlatformAdmin?: boolean
    capabilities?: string[]
  },
) {
  return submitApprovalDecision(client, {
    tenantId: input.tenantId,
    requestId: input.requestId,
    userId: input.userId,
    decision: input.decision,
    comment: input.comment,
    isPlatformAdmin: input.isPlatformAdmin,
    capabilities: input.capabilities,
  })
}
