import { readBody } from 'h3'
import { z } from 'zod'

import { recordSocialAudit } from '~/server/utils/social-audit'
import { requireSocialContext } from '~/server/utils/social-context'
import { assertPackageAllowsNewPost } from '~/server/utils/social-packages'
import { validateSocialPostAssets } from '~/server/utils/social-post-assets'
import {
  ensurePrimaryScheduleFromLegacy,
  replacePostSchedules,
} from '~/server/utils/marketing-schedules'

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
  artText: z.string().max(2000).nullable().optional(),
  cta: z.string().max(240).nullable().optional(),
  hashtags: z.array(z.string().max(100)).max(30).default([]),
  campaignId: z.string().uuid().nullable().optional(),
  assignedTo: z.string().uuid().nullable().optional(),
  scheduledAt: z.string().datetime({ offset: true }).nullable().optional(),
  schedules: z.array(z.object({
    id: z.string().uuid().optional(),
    variantId: z.string().uuid().nullable().optional(),
    platform: z.enum(['facebook', 'instagram', 'linkedin']).nullable().optional(),
    format: z.enum(['static', 'carousel', 'video', 'story']).nullable().optional(),
    scheduledAt: z.string().min(1),
    timezone: z.string().min(1).max(80).optional(),
    notes: z.string().max(500).nullable().optional(),
  })).max(50).optional(),
  timezone: z.string().min(1).max(80).default('America/Sao_Paulo'),
  approvalPolicy: z.enum(['any', 'all', 'minimum']).default('any'),
  minimumApprovals: z.number().int().positive().max(100).default(1),
  copyOwnerId: z.string().uuid().nullable().optional(),
  designOwnerId: z.string().uuid().nullable().optional(),
  publishOwnerId: z.string().uuid().nullable().optional(),
  productionPriority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  productionDueAt: z.string().datetime({ offset: true }).nullable().optional(),
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

  if (input.campaignId) {
    const { data: campaign } = await client
      .from('social_campaigns')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('id', input.campaignId)
      .maybeSingle()
    if (!campaign)
      throw createError({ statusCode: 400, statusMessage: 'Campanha inválida' })
  }

  const sharedHashtags = input.hashtags || []
  const sharedArtText = input.artText?.trim() || ''
  const sharedCta = input.cta?.trim() || ''

  const primarySchedule = input.schedules?.length
    ? [...input.schedules]
        .map(slot => new Date(slot.scheduledAt))
        .filter(date => !Number.isNaN(date.getTime()))
        .sort((a, b) => a.getTime() - b.getTime())[0]
        ?.toISOString()
    : input.scheduledAt || null

  const { data: post, error: postError } = await client
    .from('social_posts')
    .insert({
      tenant_id: tenantId,
      title: input.title,
      content: input.content,
      campaign_id: input.campaignId || null,
      assigned_to: input.assignedTo || null,
      scheduled_at: primarySchedule,
      timezone: input.timezone,
      approval_policy: input.approvalPolicy,
      minimum_approvals: input.minimumApprovals,
      package_id: packageGate.package?.id || null,
      created_by: user.id,
      copy_owner_id: input.copyOwnerId || null,
      design_owner_id: input.designOwnerId || null,
      publish_owner_id: input.publishOwnerId || null,
      production_priority: input.productionPriority || 'normal',
      production_due_at: input.productionDueAt || null,
      metadata: {
        art_text: sharedArtText || null,
        cta: sharedCta || null,
        hashtags: sharedHashtags,
      },
    })
    .select('*')
    .single()

  if (postError)
    throw createError({ statusCode: 400, statusMessage: postError.message })

  try {
    for (const variant of input.variants) {
      const platformConfig = {
        ...(variant.platformConfig || {}),
        artText: String((variant.platformConfig as any)?.artText || sharedArtText || ''),
        cta: String((variant.platformConfig as any)?.cta || sharedCta || ''),
      }
      const { data: createdVariant, error: variantError } = await client
        .from('social_post_variants')
        .insert({
          tenant_id: tenantId,
          post_id: post.id,
          account_id: variant.accountId,
          platform: variant.platform,
          format: variant.format,
          caption: variant.caption || input.content,
          link_url: variant.linkUrl || null,
          hashtags: (variant.hashtags?.length ? variant.hashtags : sharedHashtags),
          platform_config: platformConfig,
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

  if (input.schedules?.length) {
    await replacePostSchedules(client, {
      tenantId,
      postId: post.id,
      userId: user.id,
      schedules: input.schedules,
      timezone: input.timezone,
    })
  }
  else {
    await ensurePrimaryScheduleFromLegacy(client, {
      tenantId,
      postId: post.id,
      userId: user.id,
      scheduledAt: primarySchedule,
      timezone: input.timezone,
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
