import { getRouterParam, readBody } from 'h3'
import { z } from 'zod'

import { executeSocialPostDeletion } from '~/server/utils/social-deletion-domain'
import { recordSocialAudit } from '~/server/utils/social-audit'
import { requireSocialContext } from '~/server/utils/social-context'

const bodySchema = z.object({
  mode: z.enum(['cancel_draft', 'system_and_remote', 'system_only', 'retry_remote']),
  reason: z.string().trim().max(2000).nullable().optional(),
  confirmRemoteDeletion: z.boolean().optional(),
  confirmLocalOnly: z.boolean().optional(),
  forceCompleteLocal: z.boolean().optional(),
  manualConfirmations: z.array(z.object({
    variantId: z.string().uuid(),
    confirmed: z.boolean(),
  })).optional(),
  tenant_id: z.string().uuid().optional(),
})

/**
 * Soft-delete + optional remote Meta deletion.
 * Capabilities are re-validated in the domain layer (UI may only hide buttons).
 */
export default defineEventHandler(async (event) => {
  const postId = String(getRouterParam(event, 'id'))
  const body = bodySchema.parse(await readBody(event) || {})

  // Preliminary gate — domain re-checks the precise capability matrix.
  const preliminaryCapability
    = body.mode === 'retry_remote'
      ? 'marketing.social.delete.retry'
      : body.mode === 'system_and_remote'
        ? 'marketing.social.delete.remote'
        : 'marketing.social.delete.local'

  const { client, tenantId, user, workspace, isPlatformStaff } = await requireSocialContext(
    event,
    preliminaryCapability as any,
    body.tenant_id,
  )

  const outcome = await executeSocialPostDeletion(client, {
    tenantId,
    postId,
    userId: user.id,
    mode: body.mode,
    reason: body.reason,
    confirmRemoteDeletion: body.confirmRemoteDeletion,
    confirmLocalOnly: body.confirmLocalOnly,
    forceCompleteLocal: body.forceCompleteLocal,
    manualConfirmations: body.manualConfirmations,
    capabilities: workspace.capabilities,
    isPlatformStaff,
    lockOwner: `user:${user.id}`,
  })

  await recordSocialAudit(event, client, {
    tenantId,
    actorId: user.id,
    action: `social_post.deletion.${body.mode}`,
    entityType: 'social_post',
    entityId: postId,
    after: {
      mode: body.mode,
      reason: body.reason || null,
      forceCompleteLocal: Boolean(body.forceCompleteLocal),
      confirmRemoteDeletion: Boolean(body.confirmRemoteDeletion),
      confirmLocalOnly: Boolean(body.confirmLocalOnly),
      overallStatus: outcome.overallStatus,
      localDeleted: outcome.localDeleted,
      remoteDeletionStatus: outcome.remoteDeletionStatus,
      platforms: outcome.platforms.map(item => ({
        platform: item.platform,
        format: item.format,
        status: item.status,
        externalObjectId: item.externalObjectId,
        providerCode: item.providerCode,
        manualActionRequired: item.manualActionRequired,
        // Never audit tokens or raw provider secrets.
      })),
      canRetry: outcome.canRetry,
    },
  })

  const payload = {
    status: outcome.overallStatus,
    overallStatus: outcome.overallStatus,
    mode: outcome.mode,
    localDeleted: outcome.localDeleted,
    remoteDeletionStatus: outcome.remoteDeletionStatus,
    platforms: outcome.platforms,
    deleted: outcome.deleted,
    alreadyAbsent: outcome.alreadyAbsent,
    failed: outcome.failed,
    manualActions: outcome.manualActions,
    canRetry: outcome.canRetry,
    canForceLocal: outcome.canForceLocal,
  }

  // Business failure without local completion must not look like HTTP success.
  if (!outcome.localDeleted && (outcome.overallStatus === 'failed' || outcome.overallStatus === 'partial')) {
    throw createError({
      statusCode: 422,
      statusMessage: outcome.overallStatus === 'failed'
        ? 'Não foi possível concluir a exclusão'
        : 'Exclusão incompleta nas redes sociais',
      data: payload,
    })
  }

  return { data: payload }
})
