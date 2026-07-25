import { getRouterParam } from 'h3'

import { recordSocialAudit } from '~/server/utils/social-audit'
import { requireSocialContext } from '~/server/utils/social-context'

export default defineEventHandler(async (event) => {
  const assetId = String(getRouterParam(event, 'id'))
  const { client, tenantId, user } = await requireSocialContext(event, 'marketing.social.create')

  const { data: asset, error: assetError } = await client
    .from('media_assets')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('id', assetId)
    .maybeSingle()

  if (assetError || !asset)
    throw createError({ statusCode: 404, statusMessage: 'Arquivo não encontrado' })

  const { count } = await client
    .from('social_post_assets')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('asset_id', assetId)

  if (count) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Este arquivo está vinculado a uma publicação. Remova o vínculo antes de excluir.',
    })
  }

  const { data: derivatives } = await client
    .from('media_asset_derivatives')
    .select('object_path')
    .eq('tenant_id', tenantId)
    .eq('asset_id', assetId)

  const { error } = await client
    .from('media_assets')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('id', assetId)

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  await recordSocialAudit(event, client, {
    tenantId,
    actorId: user.id,
    action: 'media_asset.deleted',
    entityType: 'media_asset',
    entityId: assetId,
    before: asset,
  })

  const paths = [asset.object_path]
  paths.push(...(derivatives || []).map((item: any) => item.object_path).filter(Boolean))
  await client.storage.from('marketing-assets').remove(paths)

  return { success: true }
})
