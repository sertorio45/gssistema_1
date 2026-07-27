import { getRouterParam, readBody } from 'h3'
import { z } from 'zod'

import { canSeeInternalComments } from '~/server/utils/social-approval-ux'
import { recordSocialAudit } from '~/server/utils/social-audit'
import { requireSocialContext } from '~/server/utils/social-context'
import { anchorToRow, normalizeCommentAnchor } from '~/server/utils/social-review-links'
import { holdsCapability } from '~/constants/workspace'

const schema = z.object({
  body: z.string().trim().min(1).max(3000),
  versionId: z.string().uuid().nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
  visibility: z.enum(['internal', 'shared']).default('shared'),
  tenant_id: z.string().uuid().optional(),
  anchorType: z.enum(['none', 'image', 'carousel', 'video']).optional(),
  xPercent: z.number().min(0).max(100).nullable().optional(),
  yPercent: z.number().min(0).max(100).nullable().optional(),
  slideIndex: z.number().int().min(0).nullable().optional(),
  mediaTimeMs: z.number().int().min(0).nullable().optional(),
  assetId: z.string().uuid().nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const postId = String(getRouterParam(event, 'id'))
  const input = schema.parse(await readBody(event))
  const { client, tenantId, user, workspace, isPlatformStaff } = await requireSocialContext(
    event,
    'marketing.social.comment',
    input.tenant_id,
  )

  const canInternal = canSeeInternalComments(workspace.capabilities, isPlatformStaff)
  if (input.visibility === 'internal' && !canInternal) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Sem permissão para comentários internos',
    })
  }

  // Approvers without agency scope can only leave shared comments.
  const clientFacing = !isPlatformStaff
    && !holdsCapability(workspace.capabilities, 'agency.clients.read')
    && !holdsCapability(workspace.capabilities, 'marketing.social.manage')
  const visibility = clientFacing ? 'shared' : input.visibility

  const anchor = normalizeCommentAnchor({
    anchorType: input.anchorType,
    xPercent: input.xPercent,
    yPercent: input.yPercent,
    slideIndex: input.slideIndex,
    mediaTimeMs: input.mediaTimeMs,
    assetId: input.assetId,
  })

  const { data, error } = await client
    .from('social_comments')
    .insert({
      tenant_id: tenantId,
      post_id: postId,
      version_id: input.versionId || null,
      parent_id: input.parentId || null,
      author_id: user.id,
      body: input.body,
      visibility,
      ...anchorToRow(anchor),
    })
    .select('*')
    .single()

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  await recordSocialAudit(event, client, {
    tenantId,
    actorId: user.id,
    action: 'social_comment.created',
    entityType: 'social_comment',
    entityId: data.id,
    after: {
      postId,
      visibility,
      anchorType: anchor.anchorType,
    },
  })

  return { data }
})
