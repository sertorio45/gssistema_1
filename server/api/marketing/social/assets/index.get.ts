import { getQuery } from 'h3'

import { requireSocialContext } from '~/server/utils/social-context'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const { client, tenantId } = await requireSocialContext(event, 'marketing.social.read')

  let request = client
    .from('media_assets')
    .select('*')
    .eq('tenant_id', tenantId)
    .neq('status', 'archived')
    .order('created_at', { ascending: false })
    .limit(Math.min(200, Math.max(1, Number(query.limit || 60))))

  if (query.mime)
    request = request.like('mime_type', `${String(query.mime)}%`)
  if (query.purpose && ['reference', 'publication'].includes(String(query.purpose)))
    request = request.eq('purpose', String(query.purpose))
  if (query.search)
    request = request.ilike('name', `%${String(query.search).trim()}%`)

  const { data, error } = await request
  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  const paths = (data || []).map((row: any) => row.object_path)
  const { data: signedRows } = paths.length
    ? await client.storage.from('marketing-assets').createSignedUrls(paths, 60 * 60)
    : { data: [] }
  const signedUrls = new Map((signedRows || []).map((row: any) => [row.path, row.signedUrl]))

  return {
    data: (data || []).map((asset: any) => ({
      ...asset,
      preview_url: signedUrls.get(asset.object_path) || null,
    })),
  }
})
