import { getRouterParam } from 'h3'

import { requireSocialContext } from '~/server/utils/social-context'

export default defineEventHandler(async (event) => {
  const postId = String(getRouterParam(event, 'id'))
  const { client, tenantId } = await requireSocialContext(event, 'marketing.social.read')

  const { data: post, error } = await client
    .from('social_posts')
    .select(`
      *,
      social_post_variants!social_post_variants_post_id_fkey (
        *,
        social_accounts!social_post_variants_account_id_fkey (*),
        social_post_assets!social_post_assets_variant_id_fkey (
          id,
          position,
          media_assets!social_post_assets_asset_id_fkey (*)
        )
      ),
      social_comments!social_comments_post_id_fkey (*),
      all_assets:social_post_assets!social_post_assets_post_id_fkey (
        id,
        variant_id,
        position,
        media_assets!social_post_assets_asset_id_fkey (*)
      ),
      approval_requests!approval_requests_post_id_fkey (
        *,
        approval_request_approvers!approval_request_approvers_request_id_fkey (*),
        approval_decisions!approval_decisions_request_id_fkey (*)
      )
    `)
    .eq('tenant_id', tenantId)
    .eq('id', postId)
    .maybeSingle()

  if (error || !post)
    throw createError({ statusCode: 404, statusMessage: 'Publicação não encontrada' })

  const paths = [
    ...(post.social_post_variants || [])
      .flatMap((variant: any) => variant.social_post_assets || [])
      .map((relation: any) => relation.media_assets?.object_path)
      .filter(Boolean),
    ...(post.all_assets || [])
      .map((relation: any) => relation.media_assets?.object_path)
      .filter(Boolean),
  ]

  const signedUrls = new Map<string, string>()
  if (paths.length) {
    const { data } = await client.storage
      .from('marketing-assets')
      .createSignedUrls(paths, 60 * 60)
    for (const row of data || []) {
      if (row.path && row.signedUrl)
        signedUrls.set(row.path, row.signedUrl)
    }
  }

  for (const variant of post.social_post_variants || []) {
    for (const relation of variant.social_post_assets || []) {
      const asset = relation.media_assets
      if (asset?.object_path)
        asset.preview_url = signedUrls.get(asset.object_path) || null
    }
  }
  for (const relation of post.all_assets || []) {
    const asset = relation.media_assets
    if (asset?.object_path)
      asset.preview_url = signedUrls.get(asset.object_path) || null
  }

  return { data: post }
})
