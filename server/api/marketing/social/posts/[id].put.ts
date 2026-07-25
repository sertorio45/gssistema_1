import { getRouterParam, readBody } from 'h3'
import { z } from 'zod'

import { recordSocialAudit } from '~/server/utils/social-audit'
import { requireSocialContext } from '~/server/utils/social-context'
import { validateSocialPostAssets } from '~/server/utils/social-post-assets'

const inputSchema = z.object({
  title: z.string().trim().min(2).max(180),
  content: z.string().max(10000).default(''),
  assignedTo: z.string().uuid().nullable().optional(),
  scheduledAt: z.string().datetime({ offset: true }).nullable().optional(),
  timezone: z.string().min(1).max(80).default('America/Sao_Paulo'),
  approvalPolicy: z.enum(['any', 'all', 'minimum']).default('any'),
  minimumApprovals: z.number().int().positive().max(100).default(1),
  variants: z.array(z.object({
    id: z.string().uuid().optional(),
    accountId: z.string().uuid(),
    platform: z.enum(['facebook', 'instagram', 'linkedin']),
    format: z.enum(['static', 'carousel', 'video', 'story']).default('static'),
    caption: z.string().max(5000).default(''),
    linkUrl: z.string().url().nullable().optional(),
    hashtags: z.array(z.string().max(100)).max(30).default([]),
    platformConfig: z.record(z.unknown()).default({}),
    assetIds: z.array(z.string().uuid()).max(20).default([]),
  })).max(20).default([]),
  referenceAssetIds: z.array(z.string().uuid()).max(20).default([]),
})

export default defineEventHandler(async (event) => {
  const postId = String(getRouterParam(event, 'id'))
  const input = inputSchema.parse(await readBody(event))
  const { client, tenantId, user } = await requireSocialContext(event, 'marketing.social.create')
  await validateSocialPostAssets(client, tenantId, input.variants, input.referenceAssetIds)

  const { data: existing } = await client
    .from('social_posts')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('id', postId)
    .maybeSingle()

  if (!existing)
    throw createError({ statusCode: 404, statusMessage: 'Publicação não encontrada' })
  if (['publishing', 'published'].includes(existing.status))
    throw createError({ statusCode: 409, statusMessage: 'Uma publicação enviada não pode ser alterada' })

  await client
    .from('approval_requests')
    .update({ status: 'cancelled', resolved_at: new Date().toISOString() })
    .eq('tenant_id', tenantId)
    .eq('post_id', postId)
    .eq('status', 'pending')

  await client
    .from('publication_jobs')
    .update({ status: 'cancelled', locked_at: null, locked_by: null })
    .eq('tenant_id', tenantId)
    .eq('post_id', postId)
    .in('status', ['pending', 'retrying'])

  const { data: post, error: postError } = await client
    .from('social_posts')
    .update({
      title: input.title,
      content: input.content,
      assigned_to: input.assignedTo || null,
      scheduled_at: input.scheduledAt || null,
      timezone: input.timezone,
      approval_policy: input.approvalPolicy,
      minimum_approvals: input.minimumApprovals,
      status: 'draft',
      approved_version_id: null,
    })
    .eq('tenant_id', tenantId)
    .eq('id', postId)
    .select('*')
    .single()

  if (postError)
    throw createError({ statusCode: 400, statusMessage: postError.message })

  const { data: currentVariants } = await client
    .from('social_post_variants')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('post_id', postId)
  const incomingIds = new Set(input.variants.map(variant => variant.id).filter(Boolean))
  const removedIds = (currentVariants || [])
    .map((row: any) => String(row.id))
    .filter((id: string) => !incomingIds.has(id))

  if (removedIds.length) {
    await client
      .from('social_post_variants')
      .delete()
      .eq('tenant_id', tenantId)
      .in('id', removedIds)
  }

  for (const variant of input.variants) {
    const payload = {
      tenant_id: tenantId,
      post_id: postId,
      account_id: variant.accountId,
      platform: variant.platform,
      format: variant.format,
      caption: variant.caption,
      link_url: variant.linkUrl || null,
      hashtags: variant.hashtags,
      platform_config: variant.platformConfig,
    }
    const variantQuery = variant.id
      ? client.from('social_post_variants').update(payload).eq('id', variant.id)
      : client.from('social_post_variants').insert(payload)
    const { data: savedVariant, error: variantError } = await variantQuery.select('id').single()
    if (variantError)
      throw createError({ statusCode: 400, statusMessage: variantError.message })

    await client
      .from('social_post_assets')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('variant_id', savedVariant.id)

    if (variant.assetIds.length) {
      const { error: assetsError } = await client.from('social_post_assets').insert(
        variant.assetIds.map((assetId, position) => ({
          tenant_id: tenantId,
          post_id: postId,
          variant_id: savedVariant.id,
          asset_id: assetId,
          position,
        })),
      )
      if (assetsError)
        throw createError({ statusCode: 400, statusMessage: assetsError.message })
    }
  }

  await client
    .from('social_post_assets')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('post_id', postId)
    .is('variant_id', null)

  if (input.referenceAssetIds.length) {
    const { error: referenceError } = await client.from('social_post_assets').insert(
      input.referenceAssetIds.map((assetId, position) => ({
        tenant_id: tenantId,
        post_id: postId,
        variant_id: null,
        asset_id: assetId,
        position,
      })),
    )
    if (referenceError)
      throw createError({ statusCode: 400, statusMessage: referenceError.message })
  }

  await recordSocialAudit(event, client, {
    tenantId,
    actorId: user.id,
    action: 'social_post.updated',
    entityType: 'social_post',
    entityId: postId,
    before: existing,
    after: post,
  })

  return { data: post }
})
