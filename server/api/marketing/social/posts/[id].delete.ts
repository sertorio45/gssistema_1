import { getRouterParam } from 'h3'

import { recordSocialAudit } from '~/server/utils/social-audit'
import { requireSocialContext } from '~/server/utils/social-context'

export default defineEventHandler(async (event) => {
  const postId = String(getRouterParam(event, 'id'))
  const { client, tenantId, user } = await requireSocialContext(event, 'marketing.social.create')

  const { data: post, error: postError } = await client
    .from('social_posts')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('id', postId)
    .maybeSingle()

  if (postError || !post)
    throw createError({ statusCode: 404, statusMessage: 'Publicação não encontrada' })
  if (post.status === 'publishing') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Aguarde o término da publicação antes de excluir',
    })
  }

  const { data: deleted, error } = await client.rpc('marketing_delete_social_post', {
    p_tenant_id: tenantId,
    p_post_id: postId,
  })

  if (error || !deleted)
    throw createError({ statusCode: 400, statusMessage: error?.message || 'Não foi possível excluir a publicação' })

  await recordSocialAudit(event, client, {
    tenantId,
    actorId: user.id,
    action: 'social_post.deleted',
    entityType: 'social_post',
    entityId: postId,
    before: post,
  })

  return { success: true }
})
