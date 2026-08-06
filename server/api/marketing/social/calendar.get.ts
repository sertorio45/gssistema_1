import { getQuery } from 'h3'
import { z } from 'zod'

import { requireSocialContext } from '~/server/utils/social-context'
import type { MarketingCalendarOccurrence } from '~/types/marketing-schedules'

const querySchema = z.object({
  start: z.string().min(1),
  end: z.string().min(1),
  campaign_id: z.string().uuid().optional(),
  platform: z.enum(['facebook', 'instagram', 'linkedin']).optional(),
})

/**
 * Calendar feed expanded by schedule occurrence.
 * One content with N dates yields N rows (occurrenceId = schedule id).
 */
export default defineEventHandler(async (event) => {
  const query = querySchema.parse(getQuery(event))
  const { client, tenantId } = await requireSocialContext(event, 'marketing.social.read')

  let scheduleQuery = client
    .from('marketing_post_schedules')
    .select('id, post_id, variant_id, platform, format, scheduled_at, timezone, status, notes')
    .eq('tenant_id', tenantId)
    .neq('status', 'cancelled')
    .gte('scheduled_at', query.start)
    .lte('scheduled_at', query.end)
    .order('scheduled_at', { ascending: true })
    .limit(500)

  if (query.platform)
    scheduleQuery = scheduleQuery.eq('platform', query.platform)

  const { data: scheduleRows, error: scheduleError } = await scheduleQuery
  if (scheduleError)
    throw createError({ statusCode: 400, statusMessage: scheduleError.message })

  const postIds = [...new Set((scheduleRows || []).map((row: any) => String(row.post_id)))]
  if (!postIds.length)
    return { data: [] as MarketingCalendarOccurrence[] }

  let postsQuery = client
    .from('social_posts')
    .select(`
      id, title, tenant_id, status, editorial_status, publication_status, production_status,
      production_priority, campaign_id, assigned_to, scheduled_at, current_version, metadata,
      social_post_variants!social_post_variants_post_id_fkey (
        id, platform, format, account_id,
        social_post_assets!social_post_assets_variant_id_fkey (
          id, position,
          media_assets!social_post_assets_asset_id_fkey (
            id, name, mime_type, object_path
          )
        )
      )
    `)
    .eq('tenant_id', tenantId)
    .in('id', postIds)
    .is('deleted_at', null)

  if (query.campaign_id)
    postsQuery = postsQuery.eq('campaign_id', query.campaign_id)

  const { data: posts, error: postsError } = await postsQuery
  if (postsError)
    throw createError({ statusCode: 400, statusMessage: postsError.message })

  const postsById = new Map((posts || []).map((post: any) => [String(post.id), post]))

  const paths = (posts || [])
    .flatMap((post: any) => post.social_post_variants || [])
    .flatMap((variant: any) => variant.social_post_assets || [])
    .map((relation: any) => relation.media_assets?.object_path)
    .filter(Boolean)

  const { data: signedRows } = paths.length
    ? await client.storage.from('marketing-assets').createSignedUrls(paths, 60 * 60)
    : { data: [] }
  const signedUrls = new Map((signedRows || []).map((row: any) => [row.path, row.signedUrl]))

  for (const post of posts || []) {
    for (const variant of post.social_post_variants || []) {
      for (const relation of variant.social_post_assets || []) {
        const asset = relation.media_assets
        if (asset?.object_path)
          asset.preview_url = signedUrls.get(asset.object_path) || null
      }
    }
  }

  const occurrences: MarketingCalendarOccurrence[] = []
  for (const row of scheduleRows || []) {
    const post = postsById.get(String(row.post_id))
    if (!post)
      continue

    occurrences.push({
      occurrenceId: String(row.id),
      scheduleId: String(row.id),
      postId: String(row.post_id),
      scheduledAt: String(row.scheduled_at),
      title: String(post.title || 'Sem título'),
      platform: row.platform || null,
      format: row.format || null,
      scheduleStatus: row.status || null,
      productionPriority: post.production_priority || null,
      post: {
        ...post,
        id: post.id,
        scheduled_at: row.scheduled_at,
        schedule_id: row.id,
        schedule_platform: row.platform,
        schedule_format: row.format,
      },
    })
  }

  return { data: occurrences }
})
