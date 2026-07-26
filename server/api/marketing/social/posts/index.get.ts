import { getQuery } from 'h3'

import { requireSocialContext } from '~/server/utils/social-context'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const { client, tenantId } = await requireSocialContext(event, 'marketing.social.read')
  const page = Math.max(1, Number(query.page || 1))
  const pageSize = Math.min(100, Math.max(1, Number(query.page_size || 20)))
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let request = client
    .from('social_posts')
    .select(`
      *,
      social_post_variants!social_post_variants_post_id_fkey (
        id,
        account_id,
        platform,
        format,
        caption,
        link_url,
        hashtags,
        platform_config,
        external_post_id,
        external_post_url,
        social_accounts!social_post_variants_account_id_fkey (name, username),
        social_post_assets!social_post_assets_variant_id_fkey (
          id,
          position,
          media_assets!social_post_assets_asset_id_fkey (
            id,
            name,
            mime_type,
            object_path
          )
        )
      )
    `, { count: 'exact' })
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (query.status && query.status !== 'all')
    request = request.eq('status', String(query.status))
  if (query.search)
    request = request.ilike('title', `%${String(query.search).trim()}%`)
  if (query.start)
    request = request.gte('scheduled_at', String(query.start))
  if (query.end)
    request = request.lte('scheduled_at', String(query.end))

  const { data, error, count } = await request
  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  const rows = data || []
  const paths = rows
    .flatMap((post: any) => post.social_post_variants || [])
    .flatMap((variant: any) => variant.social_post_assets || [])
    .map((relation: any) => relation.media_assets?.object_path)
    .filter(Boolean)
  const { data: signedRows } = paths.length
    ? await client.storage.from('marketing-assets').createSignedUrls(paths, 60 * 60)
    : { data: [] }
  const signedUrls = new Map((signedRows || []).map((row: any) => [row.path, row.signedUrl]))

  for (const post of rows as any[]) {
    for (const variant of post.social_post_variants || []) {
      for (const relation of variant.social_post_assets || []) {
        const asset = relation.media_assets
        if (asset?.object_path)
          asset.preview_url = signedUrls.get(asset.object_path) || null
      }
    }
  }

  return {
    data: rows,
    pagination: {
      page,
      pageSize,
      total: count || 0,
      pageCount: Math.ceil((count || 0) / pageSize),
    },
  }
})
