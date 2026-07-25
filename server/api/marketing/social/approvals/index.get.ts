import { getQuery } from 'h3'

import { requireSocialContext } from '~/server/utils/social-context'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const { client, tenantId, user, role } = await requireSocialContext(event, 'marketing.social.read')

  let request = client
    .from('approval_requests')
    .select(`
      *,
      social_posts!approval_requests_post_id_fkey (id, title, content, status, scheduled_at, current_version),
      content_versions!approval_requests_version_id_fkey (version, snapshot),
      approval_request_approvers!approval_request_approvers_request_id_fkey (user_id),
      approval_decisions!approval_decisions_request_id_fkey (approver_id, decision, comment, created_at)
    `)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (query.status && query.status !== 'all')
    request = request.eq('status', String(query.status))

  if (role === 'atendente') {
    const { data: assigned } = await client
      .from('approval_request_approvers')
      .select('request_id')
      .eq('tenant_id', tenantId)
      .eq('user_id', user.id)
    const requestIds = (assigned || []).map((row: any) => row.request_id)
    if (!requestIds.length)
      return { data: [] }
    request = request.in('id', requestIds)
  }

  const { data, error } = await request
  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  const rows = data || []
  const paths = rows.flatMap((row: any) => {
    const version = Array.isArray(row.content_versions) ? row.content_versions[0] : row.content_versions
    return (version?.snapshot?.assets || [])
      .map((asset: any) => asset.media_assets?.object_path)
      .filter(Boolean)
  })
  const { data: signedRows } = paths.length
    ? await client.storage.from('marketing-assets').createSignedUrls(paths, 60 * 60)
    : { data: [] }
  const signedByPath = new Map((signedRows || []).map((row: any) => [row.path, row.signedUrl]))

  for (const row of rows as any[]) {
    const version = Array.isArray(row.content_versions) ? row.content_versions[0] : row.content_versions
    for (const relation of version?.snapshot?.assets || []) {
      const asset = relation.media_assets
      if (asset?.object_path)
        asset.preview_url = signedByPath.get(asset.object_path) || null
    }
  }

  return { data: rows }
})
