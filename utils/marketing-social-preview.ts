export interface SocialPreviewAsset {
  id: string
  name?: string
  mime_type?: string
  mimeType?: string
  preview_url?: string | null
  previewUrl?: string | null
  purpose?: string
}

export interface SocialContentBoardItem {
  id: string
  title: string
  caption?: string | null
  status: string
  statusLabel: string
  /** MVP simplified status when resolved by the caller. */
  mvpStatus?: string | null
  platforms: string[]
  previewAssets: SocialPreviewAsset[]
  meta?: string | null
  campaignLabel?: string | null
  assigneeLabel?: string | null
  href?: string
  raw?: unknown
}

function assetMime(asset: SocialPreviewAsset) {
  return asset.mime_type || asset.mimeType || ''
}

function assetPreview(asset: SocialPreviewAsset) {
  return asset.preview_url || asset.previewUrl || null
}

function uniqueById(assets: SocialPreviewAsset[]) {
  const seen = new Set<string>()
  return assets.filter((asset) => {
    if (!asset?.id || seen.has(asset.id))
      return false
    seen.add(asset.id)
    return true
  })
}

/** Unique publication assets from a post (same piece across networks appears once). */
export function uniquePostPreviewAssets(post: any): SocialPreviewAsset[] {
  const relations = (post?.social_post_variants || [])
    .flatMap((variant: any) => variant.social_post_assets || [])
    .sort((left: any, right: any) => Number(left.position || 0) - Number(right.position || 0))

  return uniqueById(
    relations
      .map((relation: any) => relation.media_assets)
      .filter(Boolean),
  )
}

/** Unique publication assets from an approval request snapshot. */
export function uniqueApprovalPreviewAssets(
  request: any,
  purpose: 'publication' | 'reference' = 'publication',
): SocialPreviewAsset[] {
  const version = Array.isArray(request?.content_versions)
    ? request.content_versions[0]
    : request?.content_versions
  const relations = (version?.snapshot?.assets || [])
    .filter((relation: any) => {
      const assetPurpose = relation.media_assets?.purpose
      return purpose === 'publication'
        ? assetPurpose === 'publication' || (!assetPurpose && relation.variant_id)
        : assetPurpose === 'reference' || (!assetPurpose && !relation.variant_id)
    })
    .sort((left: any, right: any) => Number(left.position || 0) - Number(right.position || 0))

  return uniqueById(
    relations
      .map((relation: any) => relation.media_assets)
      .filter(Boolean),
  )
}

export function primaryPreviewAsset(assets: SocialPreviewAsset[]) {
  return assets[0] || null
}

export function isImageAsset(asset?: SocialPreviewAsset | null) {
  return Boolean(asset && assetMime(asset).startsWith('image/'))
}

export function isVideoAsset(asset?: SocialPreviewAsset | null) {
  return Boolean(asset && assetMime(asset).startsWith('video/'))
}

export function previewUrl(asset?: SocialPreviewAsset | null) {
  return asset ? assetPreview(asset) : null
}

export function platformIcon(platform: string) {
  if (platform === 'linkedin')
    return 'lucide:linkedin'
  if (platform === 'instagram')
    return 'lucide:instagram'
  return 'lucide:facebook'
}
