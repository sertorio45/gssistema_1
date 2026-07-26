import { getRouterParam, readBody } from 'h3'
import { z } from 'zod'

import { canSeeInternalComments } from '~/server/utils/social-approval-ux'
import { recordSocialAudit } from '~/server/utils/social-audit'
import { requireSocialContext } from '~/server/utils/social-context'

const schema = z.object({
  body: z.string().trim().min(1).max(3000),
  versionId: z.string().uuid().nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
  visibility: z.enum(['internal', 'shared']).default('shared'),
  tenant_id: z.string().uuid().optional(),
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

  const { data, error } = await client
    .from('social_comments')
    .insert({
      tenant_id: tenantId,
      post_id: postId,
      version_id: input.versionId || null,
      parent_id: input.parentId || null,
      author_id: user.id,
      body: input.body,
      visibility: input.visibility,
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
    after: { postId, visibility: input.visibility },
  })

  return { data }
})
