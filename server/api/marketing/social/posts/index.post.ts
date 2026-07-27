import { readBody } from 'h3'
import { z } from 'zod'

import { recordSocialAudit } from '~/server/utils/social-audit'
import { requireSocialContext } from '~/server/utils/social-context'
import { assertPackageAllowsNewPost } from '~/server/utils/social-packages'
import { validateSocialPostAssets } from '~/server/utils/social-post-assets'

const variantSchema = z.object({
  accountId: z.string().uuid(),
  platform: z.enum(['facebook', 'instagram', 'linkedin']),
  format: z.enum(['static', 'carousel', 'video', 'story']).default('static'),
  caption: z.string().max(5000).default(''),
  linkUrl: z.string().url().nullable().optional(),
  hashtags: z.array(z.string().max(100)).max(30).default([]),
  platformConfig: z.record(z.unknown()).default({}),
  assetIds: z.array(z.string().uuid()).max(20).default([]),
})

const postSchema = z.object({
  title: z.string().trim().min(2).max(180),
  content: z.string().max(10000).default(''),
  assignedTo: z.string().uuid().nullable().optional(),
  scheduledAt: z.string().datetime({ offset: true }).nullable().optional(),
  timezone: z.string().min(1).max(80).default('America/Sao_Paulo'),
  approvalPolicy: z.enum(['any', 'all', 'minimum']).default('any'),
  minimumApprovals: z.number().int().positive().max(100).default(1),
  variants: z.array(variantSchema).max(20).default([]),
  referenceAssetIds: z.array(z.string().uuid()).max(20).default([]),
})

export default defineEventHandler(async (event) => {
  const input = postSchema.parse(await readBody(event))
  const { client, tenantId, user } = await requireSocialContext(event, 'marketing.social.create')
  const accountIds = [...new Set(input.variants.map(variant => variant.accountId))]

  if (accountIds.length) {
    const { data: accounts } = await client
      .from('social_accounts')
      .select('id')
      .eq('tenant_id', tenantId)
      .in('id', accountIds)
    if ((accounts || []).length !== accountIds.length)
      throw createError({ statusCode: 400, statusMessage: 'Uma das contas sociais é inválida' })
  }

  await validateSocialPostAssets(client, tenantId, input.variants, input.referenceAssetIds)

  const packageGate = await assertPackageAllowsNewPost(client, tenantId)

  const { data: post, error: postError } = await client
    .from('social_posts')
    .insert({
      tenant_id: tenantId,
      title: input.title,
      content: input.content,
      assigned_to: input.assignedTo || null,
      scheduled_at: input.scheduledAt || null,
      timezone: input.timezone,
      approval_policy: input.approvalPolicy,
      minimum_approvals: input.minimumApprovals,
      package_id: packageGate.package?.id || null,
      created_by: user.id,
    })
    .select('*')
    .single()

  if (postError)
    throw createError({ statusCode: 400, statusMessage: postError.message })

  try {
    for (const variant of input.variants) {
      const { data: createdVariant, error: variantError } = await client
        .from('social_post_variants')
        .insert({
          tenant_id: tenantId,
          post_id: post.id,
          account_id: variant.accountId,
          platform: variant.platform,
          format: variant.format,
          caption: variant.caption,
          link_url: variant.linkUrl || null,
          hashtags: variant.hashtags,
          platform_config: variant.platformConfig,
        })
        .select('id')
        .single()

      if (variantError)
        throw new Error(variantError.message)

      if (variant.assetIds.length) {
        const { error: assetsError } = await client
          .from('social_post_assets')
          .insert(variant.assetIds.map((assetId, position) => ({
            tenant_id: tenantId,
            post_id: post.id,
            variant_id: createdVariant.id,
            asset_id: assetId,
            position,
          })))
        if (assetsError)
          throw new Error(assetsError.message)
      }
    }

    if (input.referenceAssetIds.length) {
      const { error: referenceError } = await client
        .from('social_post_assets')
        .insert(input.referenceAssetIds.map((assetId, position) => ({
          tenant_id: tenantId,
          post_id: post.id,
          variant_id: null,
          asset_id: assetId,
          position,
        })))
      if (referenceError)
        throw new Error(referenceError.message)
    }
  }
  catch (error) {
    await client.from('social_posts').delete().eq('id', post.id)
    throw createError({
      statusCode: 400,
      statusMessage: error instanceof Error ? error.message : 'Não foi possível criar os canais',
    })
  }

  await recordSocialAudit(event, client, {
    tenantId,
    actorId: user.id,
    action: 'social_post.created',
    entityType: 'social_post',
    entityId: post.id,
    after: post,
  })

  return { data: post }
})
