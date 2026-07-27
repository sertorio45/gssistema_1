import { getRouterParam, readBody } from 'h3'
import { z } from 'zod'

import { recordSocialAudit } from '~/server/utils/social-audit'
import { assertPackageAllowsNewPost } from '~/server/utils/social-packages'
import { requireSocialContext } from '~/server/utils/social-context'

const bodySchema = z.object({
  scheduledAt: z.string().datetime({ offset: true }).nullable().optional(),
})

/** Duplicate a post as a new draft (variants + assets), optionally with a new schedule. */
export default defineEventHandler(async (event) => {
  const postId = String(getRouterParam(event, 'id'))
  const body = bodySchema.parse(await readBody(event) || {})
  const { client, tenantId, user } = await requireSocialContext(event, 'marketing.social.create')

  const { data: source } = await client
    .from('social_posts')
    .select(`
      id, title, content, timezone, approval_policy, minimum_approvals, campaign_id,
      social_post_variants!social_post_variants_post_id_fkey (
        account_id, platform, format, caption, link_url, hashtags, platform_config,
        social_post_assets!social_post_assets_variant_id_fkey (asset_id, position)
      )
    `)
    .eq('id', postId)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .maybeSingle()

  if (!source)
    throw createError({ statusCode: 404, statusMessage: 'Publicação não encontrada' })

  const packageGate = await assertPackageAllowsNewPost(client, tenantId)

  const { data: post, error } = await client
    .from('social_posts')
    .insert({
      tenant_id: tenantId,
      title: `${source.title} (cópia)`,
      content: source.content || '',
      scheduled_at: body.scheduledAt || null,
      timezone: source.timezone || 'America/Sao_Paulo',
      approval_policy: source.approval_policy || 'any',
      minimum_approvals: source.minimum_approvals || 1,
      campaign_id: source.campaign_id || null,
      package_id: packageGate.package?.id || null,
      created_by: user.id,
    })
    .select('*')
    .single()

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  try {
    for (const variant of source.social_post_variants || []) {
      const { data: createdVariant, error: variantError } = await client
        .from('social_post_variants')
        .insert({
          tenant_id: tenantId,
          post_id: post.id,
          account_id: variant.account_id,
          platform: variant.platform,
          format: variant.format,
          caption: variant.caption || '',
          link_url: variant.link_url || null,
          hashtags: variant.hashtags || [],
          platform_config: variant.platform_config || {},
        })
        .select('id')
        .single()
      if (variantError)
        throw new Error(variantError.message)

      const assets = (variant.social_post_assets || [])
        .slice()
        .sort((a: any, b: any) => a.position - b.position)
      if (assets.length) {
        const { error: assetsError } = await client
          .from('social_post_assets')
          .insert(assets.map((row: any, position: number) => ({
            tenant_id: tenantId,
            post_id: post.id,
            variant_id: createdVariant.id,
            asset_id: row.asset_id,
            position,
          })))
        if (assetsError)
          throw new Error(assetsError.message)
      }
    }
  }
  catch (err) {
    await client.from('social_posts').delete().eq('id', post.id)
    throw createError({
      statusCode: 400,
      statusMessage: err instanceof Error ? err.message : 'Falha ao duplicar canais',
    })
  }

  await recordSocialAudit(event, client, {
    tenantId,
    actorId: user.id,
    action: 'social_post.duplicated',
    entityType: 'social_post',
    entityId: post.id,
    before: { source_id: postId },
  })

  return { data: post }
})
