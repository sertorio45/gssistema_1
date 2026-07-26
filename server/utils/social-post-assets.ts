interface VariantAssetInput {
  platform?: 'facebook' | 'instagram' | 'linkedin'
  format: 'static' | 'carousel' | 'video' | 'story'
  assetIds: string[]
}

export async function validateSocialPostAssets(
  client: any,
  tenantId: string,
  variants: VariantAssetInput[],
  referenceAssetIds: string[],
) {
  const publicationAssetIds = [...new Set(variants.flatMap(variant => variant.assetIds))]
  const allAssetIds = [...new Set([...publicationAssetIds, ...referenceAssetIds])]
  if (!allAssetIds.length)
    return

  const { data: assets, error } = await client
    .from('media_assets')
    .select('id, purpose, mime_type')
    .eq('tenant_id', tenantId)
    .in('id', allAssetIds)

  if (error || (assets || []).length !== allAssetIds.length)
    throw createError({ statusCode: 400, statusMessage: 'Um dos arquivos selecionados é inválido' })

  const assetsById = new Map<string, any>(
    (assets || []).map((asset: any): [string, any] => [asset.id, asset]),
  )
  if (publicationAssetIds.some(id => assetsById.get(id)?.purpose !== 'publication'))
    throw createError({ statusCode: 400, statusMessage: 'Peças finais devem usar arquivos de publicação' })
  if (referenceAssetIds.some(id => assetsById.get(id)?.purpose !== 'reference'))
    throw createError({ statusCode: 400, statusMessage: 'Referências devem usar arquivos de referência' })

  for (const variant of variants) {
    if (variant.platform === 'linkedin' && variant.format === 'video') {
      throw createError({
        statusCode: 400,
        statusMessage: 'O publicador atual do LinkedIn não aceita vídeos',
      })
    }
    const selectedAssets: any[] = variant.assetIds.map(id => assetsById.get(id)).filter(Boolean)
    if (variant.format === 'carousel' && selectedAssets.length > 10)
      throw createError({ statusCode: 400, statusMessage: 'Carrosséis aceitam no máximo 10 peças' })
    if (variant.format !== 'carousel' && selectedAssets.length > 1)
      throw createError({ statusCode: 400, statusMessage: 'Post estático ou vídeo aceita somente um arquivo' })
    if (variant.format === 'video' && selectedAssets.some(asset => !asset.mime_type?.startsWith('video/')))
      throw createError({ statusCode: 400, statusMessage: 'O formato vídeo exige um arquivo de vídeo' })
    if (variant.format !== 'video' && selectedAssets.some(asset => asset.mime_type?.startsWith('video/')))
      throw createError({ statusCode: 400, statusMessage: 'Use o formato vídeo para publicar este arquivo' })
  }
}
