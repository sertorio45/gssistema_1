import type {
  MetaAdCreativePayload,
  MetaCreativeCopy,
  MetaCreativeMediaItem,
  MetaCreativeType,
} from '~/types/meta-creatives'

import { hqMetaPictureUrl } from '~/lib/meta-media'

export const META_MARKETING_API_VERSION = 'v23.0'

/** CDN Meta às vezes devolve URL a começar por // */
function normalizeCdnUrl(u: string): string {
  const s = u.trim()
  if (s.startsWith('https://') || s.startsWith('http://'))
    return s
  if (s.startsWith('//'))
    return `https:${s}`
  return s
}

function resolvableUrl(s: unknown): string | null {
  if (typeof s !== 'string' || !s.trim())
    return null
  const n = normalizeCdnUrl(s)
  return n.startsWith('http') ? n : null
}

function graphUrl(path: string) {
  const p = path.startsWith('/') ? path.slice(1) : path
  return `https://graph.facebook.com/${META_MARKETING_API_VERSION}/${p}`
}

function parseMaybeObject(v: unknown): Record<string, any> | null {
  if (v == null)
    return null
  let cur: unknown = v
  for (let depth = 0; depth < 3; depth++) {
    if (typeof cur === 'string') {
      try {
        cur = JSON.parse(cur)
      }
      catch {
        return null
      }
      continue
    }
    break
  }
  if (typeof cur === 'object' && cur != null)
    return cur as Record<string, any>
  return null
}

/** API Meta por vezes devolve images/videos como array ou como { data: [...] } */
function normalizeAssetFeedArrays(afs: Record<string, any>): Record<string, any> {
  const vRaw = afs.videos
  const iRaw = afs.images
  const videos = [
    ...(Array.isArray(vRaw) ? vRaw : []),
    ...(Array.isArray(vRaw?.data) ? vRaw.data : []),
  ]
  const images = [
    ...(Array.isArray(iRaw) ? iRaw : []),
    ...(Array.isArray(iRaw?.data) ? iRaw.data : []),
  ]
  return { ...afs, videos, images }
}

function assetFeedSpecOf(creative: Record<string, any>): Record<string, any> | null {
  const raw = parseMaybeObject(creative.asset_feed_spec)
  if (!raw)
    return null
  return normalizeAssetFeedArrays(raw)
}

/** object_story_spec e, em muitos criativos dinâmicos/placement, effective_object_story_spec */
function objectStorySpecOf(creative: Record<string, any>): Record<string, any> | null {
  return parseMaybeObject(creative.object_story_spec)
    ?? parseMaybeObject(creative.effective_object_story_spec)
}

/** Graph pode devolver `picture` como URL string ou objeto (ex.: data/uri) */
function normalizeVideoPicture(p: unknown): string | null {
  if (typeof p === 'string' && (p.startsWith('http') || p.startsWith('//')))
    return normalizeCdnUrl(p)
  if (!p || typeof p !== 'object')
    return null
  const o = p as Record<string, unknown>
  if (typeof o.url === 'string' && o.url.startsWith('http'))
    return o.url
  const data = o.data
  if (typeof data === 'string' && data.startsWith('http'))
    return data
  if (Array.isArray(data) && data.length) {
    const first = data[0] as Record<string, unknown>
    const uri = first?.uri ?? first?.url
    if (typeof uri === 'string' && uri.startsWith('http'))
      return uri
  }
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>
    const uri = d.uri ?? d.url
    if (typeof uri === 'string' && uri.startsWith('http'))
      return uri
  }
  return null
}

function pickLargestThumbnail(thumbs: any): string | null {
  const arr = Array.isArray(thumbs?.data)
    ? thumbs.data
    : Array.isArray(thumbs)
      ? thumbs
      : null
  if (!arr?.length)
    return null
  let best: { uri: string, area: number } | null = null
  for (const t of arr) {
    const w = Number(t?.width || 0)
    const h = Number(t?.height || 0)
    const uri = t?.uri
    if (typeof uri !== 'string' || (!uri.startsWith('http') && !uri.startsWith('//')))
      continue
    const area = w * h
    if (!best || area > best.area)
      best = { uri: normalizeCdnUrl(uri), area }
  }
  return best?.uri || null
}

function mergeAdImageRows(
  rows: any[],
  map: Map<string, { url: string, width: number | null, height: number | null }>,
) {
  for (const row of rows) {
    const h = row?.hash != null ? String(row.hash) : ''
    const rawUrl
      = typeof row?.url === 'string' && row.url.trim()
        ? row.url
        : (typeof row?.permalink_url === 'string' ? row.permalink_url : '')
    const url = rawUrl && (rawUrl.startsWith('http') || rawUrl.startsWith('//'))
      ? normalizeCdnUrl(rawUrl)
      : null
    if (!h || !url)
      continue
    map.set(h, {
      url,
      width: row?.original_width != null ? Number(row.original_width) : (row?.width != null ? Number(row.width) : null),
      height: row?.original_height != null ? Number(row.original_height) : (row?.height != null ? Number(row.height) : null),
    })
  }
}

/**
 * GET act_{AD_ACCOUNT_ID}/adimages — hashes como JSON array (string).
 * Fallback: hash a hash se o lote não devolver linha (limite/encoding).
 */
async function fetchAdImageDetails(
  accessToken: string,
  adAccountId: string,
  hashes: string[],
): Promise<Map<string, { url: string, width: number | null, height: number | null }>> {
  const map = new Map<string, { url: string, width: number | null, height: number | null }>()
  const unique = [...new Set(hashes.filter(Boolean))]
  if (!unique.length)
    return map
  const base = graphUrl(`act_${adAccountId}/adimages`)
  const chunkSize = 50
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize)
    try {
      const res = await $fetch<any>(base, {
        query: {
          hashes: JSON.stringify(chunk),
          fields: 'hash,url,permalink_url,width,height,original_width,original_height',
          access_token: accessToken,
        },
      })
      if (res?.error)
        continue
      mergeAdImageRows(res?.data || [], map)
    }
    catch {
      // ignore chunk
    }
  }
  for (const h of unique) {
    if (map.has(h))
      continue
    try {
      const res = await $fetch<any>(base, {
        query: {
          hashes: JSON.stringify([h]),
          fields: 'hash,url,permalink_url,width,height,original_width,original_height',
          access_token: accessToken,
        },
      })
      if (res?.error)
        continue
      mergeAdImageRows(res?.data || [], map)
    }
    catch {
      // ignore
    }
  }
  return map
}

function mapGraphVideoRow(res: any): {
  source: string | null
  picture: string | null
  thumb: string | null
  embed_html: string | null
  width: number | null
  height: number | null
  length: number | null
} | null {
  if (!res || res.error)
    return null
  const picture = normalizeVideoPicture(res?.picture)
  const largeTh = pickLargestThumbnail(res?.thumbnails)
  const thumb = picture || largeTh || null
  const embedRaw = res?.embed_html
  const embed_html = typeof embedRaw === 'string' && embedRaw.trim() ? embedRaw : null
  return {
    source: typeof res?.source === 'string' && (res.source.startsWith('http') || res.source.startsWith('//'))
      ? normalizeCdnUrl(res.source)
      : null,
    picture,
    thumb,
    embed_html,
    width: null,
    height: null,
    length: res?.length != null ? Number(res.length) : null,
  }
}

/**
 * Vídeo de anúncio: GET /{VIDEO_ID} (nó Video). Se vazio, fallback GET act_{AD_ACCOUNT_ID}/advideos
 * com filtering IN (vídeos ligados à conta de anúncios).
 */
async function fetchVideoDetails(
  accessToken: string,
  videoId: string,
  adAccountId?: string,
): Promise<{
  source: string | null
  picture: string | null
  thumb: string | null
  embed_html: string | null
  width: number | null
  height: number | null
  length: number | null
} | null> {
  const fields = 'id,source,picture,embed_html,thumbnails{uri,width,height},length'

  try {
    const res = await $fetch<any>(graphUrl(String(videoId)), {
      query: {
        fields,
        access_token: accessToken,
      },
    })
    const mapped = mapGraphVideoRow(res)
    if (mapped && (mapped.source || mapped.thumb || mapped.embed_html))
      return mapped
  }
  catch {
    // tenta advideos
  }

  if (adAccountId) {
    const filters = [
      JSON.stringify([{ field: 'id', operator: 'IN', value: [String(videoId)] }]),
      JSON.stringify([{ field: 'id', operator: 'EQUAL', value: String(videoId) }]),
    ]
    for (const filtering of filters) {
      try {
        const res = await $fetch<any>(graphUrl(`act_${adAccountId}/advideos`), {
          query: {
            fields,
            filtering,
            access_token: accessToken,
          },
        })
        if (res?.error)
          continue
        const row = Array.isArray(res?.data) ? res.data[0] : null
        const mapped = mapGraphVideoRow(row)
        if (mapped && (mapped.source || mapped.thumb || mapped.embed_html))
          return mapped
      }
      catch {
        continue
      }
    }
  }

  return null
}

async function fetchAdCreativeById(accessToken: string, creativeId: string): Promise<Record<string, any> | null> {
  const fieldSets = [
    'id,name,object_story_spec,effective_object_story_spec,asset_feed_spec',
    'id,name,object_story_spec,asset_feed_spec',
    'id,name,asset_feed_spec',
  ]
  for (const fields of fieldSets) {
    try {
      const res = await $fetch<any>(graphUrl(String(creativeId)), {
        query: {
          fields,
          access_token: accessToken,
        },
      })
      if (res?.error)
        continue
      return res
    }
    catch {
      continue
    }
  }
  return null
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = []
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency)
    const part = await Promise.all(batch.map((it, j) => fn(it, i + j)))
    results.push(...part)
  }
  return results
}

function extractCopy(creative: Record<string, any>): MetaCreativeCopy {
  const bodies: string[] = []
  const titles: string[] = []
  const call_to_action_types: string[] = []
  let cta: string | null = null
  const afs = assetFeedSpecOf(creative)
  if (afs) {
    if (Array.isArray(afs.bodies)) {
      for (const b of afs.bodies) {
        if (b?.text)
          bodies.push(String(b.text))
      }
    }
    if (Array.isArray(afs.titles)) {
      for (const t of afs.titles) {
        if (t?.text)
          titles.push(String(t.text))
      }
    }
    if (Array.isArray(afs.call_to_action_types)) {
      for (const x of afs.call_to_action_types)
        call_to_action_types.push(String(x))
    }
  }
  const oss = objectStorySpecOf(creative)
  const ld = oss?.link_data
  if (ld) {
    if (ld.message)
      bodies.push(String(ld.message))
    if (ld.name)
      titles.push(String(ld.name))
    if (ld.description)
      bodies.push(String(ld.description))
    const ctaType = ld.call_to_action?.type
    if (ctaType)
      cta = String(ctaType)
  }
  return {
    bodies: [...new Set(bodies.filter(Boolean))],
    titles: [...new Set(titles.filter(Boolean))],
    cta,
    call_to_action_types: [...new Set(call_to_action_types.filter(Boolean))],
  }
}

function detectType(
  creative: Record<string, any>,
  mediasLen: number,
): MetaCreativeType {
  const afs = assetFeedSpecOf(creative)
  if (afs) {
    const nImg = Array.isArray(afs.images) ? afs.images.length : 0
    const nVid = Array.isArray(afs.videos) ? afs.videos.length : 0
    if (nImg + nVid > 1)
      return 'dynamic'
    if (nImg > 0 && nVid > 0)
      return 'dynamic'
  }
  const oss = objectStorySpecOf(creative)
  const children = oss?.link_data?.child_attachments
  if (Array.isArray(children) && children.length > 1)
    return 'carousel'
  if (oss?.video_data?.video_id || (afs?.videos?.length === 1 && mediasLen === 1))
    return 'video'
  if (mediasLen > 1 && (assetFeedSpecOf(creative) || children))
    return mediasLen > 2 ? 'dynamic' : 'carousel'
  return 'image'
}

/**
 * Lista anúncios e devolve criativos com mídias em alta resolução.
 */
export async function fetchMetaAdCreatives(
  accessToken: string,
  adAccountId: string,
  options?: { activeOnly?: boolean },
): Promise<MetaAdCreativePayload[]> {
  const activeOnly = options?.activeOnly !== false
  /** Criativo aninhado evita GET /{id} quando a API já devolve asset_feed_spec / OSS */
  const adsQuery: Record<string, string> = {
    fields:
      'id,name,effective_status,creative{id,name,object_story_spec,effective_object_story_spec,asset_feed_spec}',
    limit: '100',
    access_token: accessToken,
  }
  if (activeOnly) {
    adsQuery.filtering = JSON.stringify([
      { field: 'effective_status', operator: 'IN', value: ['ACTIVE'] },
    ])
  }

  let adsRes: any
  try {
    adsRes = await $fetch<any>(graphUrl(`act_${adAccountId}/ads`), {
      query: adsQuery,
    })
  }
  catch {
    try {
      adsRes = await $fetch<any>(graphUrl(`act_${adAccountId}/ads`), {
        query: {
          ...adsQuery,
          fields: 'id,name,effective_status,creative{id}',
        },
      })
    }
    catch {
      adsRes = { data: [] }
    }
  }

  const ads = adsRes?.data || []
  const creativeIds = [...new Set(
    ads.map((a: any) => a.creative?.id).filter(Boolean).map((id: any) => String(id)),
  )]

  if (!creativeIds.length)
    return []

  const creativeById = new Map<string, Record<string, any>>()
  for (const ad of ads) {
    const c = ad.creative
    if (c?.id)
      creativeById.set(String(c.id), c as Record<string, any>)
  }

  function creativeHasFetchableAssets(c: Record<string, any>): boolean {
    const afs = assetFeedSpecOf(c)
    if (afs) {
      const nv = Array.isArray(afs.videos) ? afs.videos.length : 0
      const ni = Array.isArray(afs.images) ? afs.images.length : 0
      if (nv + ni > 0)
        return true
    }
    const oss = objectStorySpecOf(c)
    if (!oss)
      return false
    if (oss.video_data?.video_id)
      return true
    if (oss.link_data?.image_hash || oss.link_data?.picture)
      return true
    const ch = oss.link_data?.child_attachments
    if (Array.isArray(ch) && ch.length)
      return true
    if (oss.photo_data?.image_hash || oss.photo_data?.url)
      return true
    return false
  }

  await mapWithConcurrency([...creativeById.keys()], 12, async (cid) => {
    const c = creativeById.get(cid)
    if (!c)
      return
    if (creativeHasFetchableAssets(c))
      return
    const full = await fetchAdCreativeById(accessToken, cid)
    if (full?.id)
      creativeById.set(cid, { ...c, ...full })
  })

  const videoIds = new Set<string>()
  const imageHashes = new Set<string>()

  function collectFromOss(oss: Record<string, any> | null) {
    if (!oss)
      return
    const ld = oss.link_data
    if (ld?.image_hash)
      imageHashes.add(String(ld.image_hash))
    const vd = oss.video_data
    if (vd?.video_id)
      videoIds.add(String(vd.video_id))
    const children = ld?.child_attachments
    if (Array.isArray(children)) {
      for (const ch of children) {
        if (ch?.image_hash)
          imageHashes.add(String(ch.image_hash))
        if (ch?.video_id)
          videoIds.add(String(ch.video_id))
      }
    }
    const pd = oss.photo_data
    if (pd?.image_hash)
      imageHashes.add(String(pd.image_hash))
  }

  function collectFromAfs(afs: any) {
    if (!afs || typeof afs !== 'object')
      return
    if (Array.isArray(afs.images)) {
      for (const im of afs.images) {
        if (im == null)
          continue
        if (typeof im === 'string' && im)
          imageHashes.add(im)
        else if (typeof im === 'object') {
          if (im?.hash)
            imageHashes.add(String(im.hash))
          else if (im?.image_hash)
            imageHashes.add(String(im.image_hash))
        }
      }
    }
    if (Array.isArray(afs.videos)) {
      for (const v of afs.videos) {
        if (v == null)
          continue
        if (typeof v === 'string' || typeof v === 'number')
          videoIds.add(String(v))
        else if (typeof v === 'object' && v?.video_id != null)
          videoIds.add(String(v.video_id))
      }
    }
  }

  for (const c of creativeById.values()) {
    collectFromOss(objectStorySpecOf(c))
    collectFromAfs(assetFeedSpecOf(c))
  }

  const hashMap = await fetchAdImageDetails(accessToken, adAccountId, [...imageHashes])
  const videoMap = new Map<string, NonNullable<Awaited<ReturnType<typeof fetchVideoDetails>>>>()
  const vidList = [...videoIds]
  const videoRows = await mapWithConcurrency(vidList, 10, vid =>
    fetchVideoDetails(accessToken, vid, adAccountId))
  for (let i = 0; i < vidList.length; i++) {
    const d = videoRows[i]
    if (d)
      videoMap.set(vidList[i], d)
  }

  function buildMediasForCreative(creative: Record<string, any>): MetaCreativeMediaItem[] {
    const medias: MetaCreativeMediaItem[] = []
    const afs = assetFeedSpecOf(creative)

    if (afs) {
      if (Array.isArray(afs.videos)) {
        for (const v of afs.videos) {
          if (v == null)
            continue
          const vid = typeof v === 'object' && v != null && v.video_id != null
            ? String(v.video_id)
            : (typeof v === 'string' || typeof v === 'number' ? String(v) : '')
          if (!vid)
            continue
          const vd = videoMap.get(vid)
          /** Fallback só quando o Graph não devolve nada (token/página); feed costuma ser 160px */
          const feedThumb = typeof v === 'object' && v != null
            ? resolvableUrl(v.thumbnail_url)
            : null

          if (!vd) {
            medias.push({
              type: 'video',
              url: '',
              thumbnail: feedThumb ? (hqMetaPictureUrl(feedThumb) || feedThumb) : null,
              width: null,
              height: null,
              duration: null,
              video_id: vid,
              embed_html: null,
              preview_only: true,
            })
            continue
          }

          const src = vd.source
          const embed = vd.embed_html
          const thumbRaw = vd.thumb || vd.picture || feedThumb
          const thumbnail = thumbRaw ? (hqMetaPictureUrl(thumbRaw) || thumbRaw) : null
          if (!src && !thumbnail && !embed) {
            medias.push({
              type: 'video',
              url: '',
              thumbnail: null,
              width: vd.width ?? null,
              height: vd.height ?? null,
              duration: vd.length ?? null,
              video_id: vid,
              embed_html: null,
              preview_only: true,
            })
            continue
          }
          medias.push({
            type: 'video',
            url: src || '',
            thumbnail,
            width: vd.width ?? null,
            height: vd.height ?? null,
            duration: vd.length ?? null,
            video_id: vid,
            embed_html: embed,
            preview_only: !src && !embed,
          })
        }
      }
      if (Array.isArray(afs.images)) {
        for (const im of afs.images) {
          if (im == null)
            continue
          const hash = typeof im === 'string' && im
            ? im
            : (typeof im === 'object'
                ? (im?.hash != null
                    ? String(im.hash)
                    : (im?.image_hash != null ? String(im.image_hash) : ''))
                : '')
          const det = hash ? hashMap.get(hash) : null
          const url = det?.url || ''
          if (url) {
            medias.push({
              type: 'image',
              url,
              thumbnail: url,
              width: det?.width ?? null,
              height: det?.height ?? null,
            })
          }
        }
      }
    }

    if (medias.length)
      return medias

    const oss = objectStorySpecOf(creative)
    if (!oss)
      return medias

    const children = oss.link_data?.child_attachments
    if (Array.isArray(children) && children.length) {
      for (const ch of children) {
        const vid = ch?.video_id != null ? String(ch.video_id) : ''
        if (vid) {
          const vd = videoMap.get(vid)
          if (vd) {
            const src = vd.source
            const embed = vd.embed_html
            const thumbRaw = vd.thumb || vd.picture || resolvableUrl(ch.picture)
            const thumbnail = thumbRaw ? (hqMetaPictureUrl(thumbRaw) || thumbRaw) : null
            if (src || thumbnail || embed) {
              medias.push({
                type: 'video',
                url: src || '',
                thumbnail,
                width: vd.width ?? null,
                height: vd.height ?? null,
                duration: vd.length ?? null,
                video_id: vid,
                embed_html: embed,
                preview_only: !src && !embed,
              })
              continue
            }
          }
        }
        const ih = ch?.image_hash != null ? String(ch.image_hash) : ''
        const det = ih ? hashMap.get(ih) : null
        const pic = resolvableUrl(ch.picture)
        const url = det?.url || pic || ''
        if (url) {
          medias.push({
            type: 'image',
            url,
            thumbnail: det?.url || pic || url,
            width: det?.width ?? null,
            height: det?.height ?? null,
          })
        }
      }
      return medias
    }

    if (oss.video_data?.video_id) {
      const vid = String(oss.video_data.video_id)
      const vd = videoMap.get(vid)
      if (vd) {
        const src = vd.source
        const embed = vd.embed_html
        const thumbRaw = vd.thumb || vd.picture || null
        const thumbnail = thumbRaw ? (hqMetaPictureUrl(thumbRaw) || thumbRaw) : null
        if (src || thumbnail || embed) {
          medias.push({
            type: 'video',
            url: src || '',
            thumbnail,
            width: vd.width ?? null,
            height: vd.height ?? null,
            duration: vd.length ?? null,
            video_id: vid,
            embed_html: embed,
            preview_only: !src && !embed,
          })
        }
      }
      return medias
    }

    const ld = oss.link_data
    if (ld) {
      const ih = ld.image_hash != null ? String(ld.image_hash) : ''
      const det = ih ? hashMap.get(ih) : null
      const pic = resolvableUrl(ld.picture)
      const url = det?.url || pic || ''
      if (url) {
        medias.push({
          type: 'image',
          url,
          thumbnail: det?.url || pic || url,
          width: det?.width ?? null,
          height: det?.height ?? null,
        })
      }
    }

    const pd = oss.photo_data
    const pdUrl = resolvableUrl(pd?.url)
    if (pdUrl) {
      const ih = pd.image_hash != null ? String(pd.image_hash) : ''
      const det = ih ? hashMap.get(ih) : null
      medias.push({
        type: 'image',
        url: det?.url || pdUrl,
        thumbnail: det?.url || pdUrl,
        width: det?.width ?? null,
        height: det?.height ?? null,
      })
    }

    return medias
  }

  const out: MetaAdCreativePayload[] = []

  for (const ad of ads) {
    const cid = ad.creative?.id != null ? String(ad.creative.id) : ''
    const creative = cid ? creativeById.get(cid) : null
    if (!creative) {
      out.push({
        ad_id: String(ad.id),
        ad_name: ad.name != null ? String(ad.name) : null,
        creative_id: cid || null,
        creative_type: 'image',
        medias: [],
        copy: { bodies: [], titles: [], cta: null, call_to_action_types: [] },
        preview_thumbnail: null,
      })
      continue
    }

    const medias = buildMediasForCreative(creative)
    const creative_type = detectType(creative, medias.length)
    const copy = extractCopy(creative)
    const preview = medias[0]?.thumbnail || medias[0]?.url || null

    out.push({
      ad_id: String(ad.id),
      ad_name: ad.name != null ? String(ad.name) : null,
      creative_id: cid || null,
      creative_type,
      medias,
      copy,
      preview_thumbnail: preview,
    })
  }

  return out
}
