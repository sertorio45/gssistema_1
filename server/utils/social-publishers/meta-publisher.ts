import process from 'node:process'

import { createError } from 'h3'

import { decryptSecret } from '~/server/utils/marketing'

interface MetaPublishInput {
  client: any
  tenantId: string
  account: any
  variant: any
  assets: any[]
}

async function waitForInstagramContainer(
  graphBase: string,
  containerId: string,
  accessToken: string,
) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const response = await $fetch<any>(`${graphBase}/${containerId}`, {
      query: { fields: 'status_code,status', access_token: accessToken },
    })
    if (response.status_code === 'FINISHED')
      return
    if (response.status_code === 'ERROR' || response.status_code === 'EXPIRED')
      throw createError({ statusCode: 502, statusMessage: response.status || 'Falha ao preparar mídia no Instagram' })
    await new Promise(resolve => setTimeout(resolve, 3000))
  }
  throw createError({ statusCode: 504, statusMessage: 'Instagram não terminou de processar a mídia' })
}

async function getSignedAssetUrls(client: any, assets: any[]) {
  const paths = assets.map(asset => asset.object_path).filter(Boolean)
  if (!paths.length)
    return []
  const { data, error } = await client.storage.from('marketing-assets').createSignedUrls(paths, 60 * 60)
  if (error)
    throw createError({ statusCode: 500, statusMessage: error.message })

  const byPath = new Map((data || []).map((row: any) => [row.path, row.signedUrl]))
  return assets.map(asset => ({
    ...asset,
    signedUrl: byPath.get(asset.object_path),
  }))
}

async function publishInstagram(input: MetaPublishInput, token: string, graphBase: string) {
  const media = await getSignedAssetUrls(input.client, input.assets)
  if (!media.length)
    throw createError({ statusCode: 400, statusMessage: 'Instagram exige ao menos uma mídia' })

  const caption = [
    input.variant.caption || '',
    ...(input.variant.hashtags || []).map((tag: string) => tag.startsWith('#') ? tag : `#${tag}`),
  ].filter(Boolean).join('\n\n')

  const children: string[] = []
  for (const asset of media) {
    const isVideo = String(asset.mime_type).startsWith('video/')
    const body: Record<string, unknown> = {
      access_token: token,
      is_carousel_item: media.length > 1,
    }
    if (isVideo) {
      body.media_type = 'REELS'
      body.video_url = asset.signedUrl
    }
    else {
      body.image_url = asset.signedUrl
    }
    if (media.length === 1)
      body.caption = caption

    const container = await $fetch<any>(
      `${graphBase}/${input.account.external_account_id}/media`,
      { method: 'POST', body },
    )
    await waitForInstagramContainer(graphBase, container.id, token)
    children.push(container.id)
  }

  let creationId = children[0]
  if (children.length > 1) {
    const carousel = await $fetch<any>(
      `${graphBase}/${input.account.external_account_id}/media`,
      {
        method: 'POST',
        body: {
          media_type: 'CAROUSEL',
          children: children.join(','),
          caption,
          access_token: token,
        },
      },
    )
    await waitForInstagramContainer(graphBase, carousel.id, token)
    creationId = carousel.id
  }

  const published = await $fetch<any>(
    `${graphBase}/${input.account.external_account_id}/media_publish`,
    {
      method: 'POST',
      body: { creation_id: creationId, access_token: token },
    },
  )

  return {
    externalPostId: String(published.id),
    externalPostUrl: null,
  }
}

async function publishFacebook(input: MetaPublishInput, token: string, graphBase: string) {
  const media = await getSignedAssetUrls(input.client, input.assets)
  const message = [
    input.variant.caption || '',
    ...(input.variant.hashtags || []).map((tag: string) => tag.startsWith('#') ? tag : `#${tag}`),
  ].filter(Boolean).join('\n\n')

  if (!media.length) {
    const post = await $fetch<any>(`${graphBase}/${input.account.external_account_id}/feed`, {
      method: 'POST',
      body: {
        message,
        link: input.variant.link_url || undefined,
        access_token: token,
      },
    })
    return { externalPostId: String(post.id), externalPostUrl: null }
  }

  if (media.length > 1) {
    const attachedMedia: Array<{ media_fbid: string }> = []
    for (const asset of media) {
      if (String(asset.mime_type).startsWith('video/'))
        throw createError({ statusCode: 400, statusMessage: 'Carrossel do Facebook aceita apenas imagens neste fluxo' })
      const uploaded = await $fetch<any>(
        `${graphBase}/${input.account.external_account_id}/photos`,
        {
          method: 'POST',
          body: {
            url: asset.signedUrl,
            published: false,
            access_token: token,
          },
        },
      )
      attachedMedia.push({ media_fbid: String(uploaded.id) })
    }
    const post = await $fetch<any>(
      `${graphBase}/${input.account.external_account_id}/feed`,
      {
        method: 'POST',
        body: {
          message,
          attached_media: attachedMedia,
          access_token: token,
        },
      },
    )
    return { externalPostId: String(post.id), externalPostUrl: null }
  }

  const first = media[0]
  const isVideo = String(first.mime_type).startsWith('video/')
  const endpoint = isVideo ? 'videos' : 'photos'
  const body = isVideo
    ? { file_url: first.signedUrl, description: message, access_token: token }
    : { url: first.signedUrl, caption: message, access_token: token }
  const post = await $fetch<any>(
    `${graphBase}/${input.account.external_account_id}/${endpoint}`,
    { method: 'POST', body },
  )

  return { externalPostId: String(post.post_id || post.id), externalPostUrl: null }
}

export async function publishToMeta(input: MetaPublishInput) {
  const { data: integration } = await input.client
    .from('marketing_integrations')
    .select('config')
    .eq('tenant_id', input.tenantId)
    .eq('provider', 'meta')
    .eq('is_active', true)
    .maybeSingle()

  const config = integration?.config || {}
  // Instagram Graph API (Facebook Login) and Facebook Page publishing both require
  // a Page access token of the Page linked to the Instagram professional account.
  const pageToken = decryptSecret(config.page_access_token_enc)
  const userToken = decryptSecret(config.access_token_enc)
  const token = pageToken || (input.account.platform === 'facebook' ? userToken : null)
  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: input.account.platform === 'instagram'
        ? 'Integração Meta sem token da Página. Selecione novamente a Página do Facebook vinculada ao Instagram.'
        : 'Integração Meta sem token válido',
    })
  }

  const graphVersion = process.env.META_GRAPH_VERSION || 'v20.0'
  const graphBase = `https://graph.facebook.com/${graphVersion}`
  if (input.account.platform === 'instagram')
    return publishInstagram(input, token, graphBase)
  return publishFacebook(input, token, graphBase)
}
