import { serverSupabaseServiceRole } from '#supabase/server'

import { createError, defineEventHandler, getQuery } from 'h3'

import {
  buildMarketingOverviewCacheKey,
  decryptSecret,
  getCachedMarketingData,
  resolveMarketingTenantContext,
  setCachedMarketingData,
} from '~/server/utils/marketing'

async function getGoogleAccessToken(config: Record<string, any>) {
  const accessToken = decryptSecret(config.access_token_enc)
  if (accessToken)
    return accessToken

  const refreshToken = decryptSecret(config.refresh_token_enc)
  const clientId = decryptSecret(config.client_id_enc)
  const clientSecret = decryptSecret(config.client_secret_enc)
  if (!refreshToken || !clientId || !clientSecret)
    return null

  const tokenResponse = await $fetch<any>('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  })
  return tokenResponse?.access_token || null
}

function utcYmd(d: Date) {
  return d.toISOString().slice(0, 10)
}

function buildGoogleDateWhere(datePreset: string, dateStart: string, dateEnd: string) {
  if (datePreset === 'custom' && dateStart && dateEnd)
    return `segments.date BETWEEN '${dateStart}' AND '${dateEnd}'`
  if (datePreset === 'today')
    return `segments.date = '${utcYmd(new Date())}'`
  if (datePreset === 'yesterday') {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - 1)
    return `segments.date = '${utcYmd(d)}'`
  }
  const map: Record<string, string> = {
    last_7d: 'LAST_7_DAYS',
    last_14d: 'LAST_14_DAYS',
    last_30d: 'LAST_30_DAYS',
    last_90d: 'LAST_90_DAYS',
  }
  const dr = map[datePreset] || 'LAST_30_DAYS'
  return `segments.date DURING ${dr}`
}

async function fetchGoogleData(
  config: Record<string, any>,
  dateOpts: { datePreset: string, dateStart: string, dateEnd: string },
) {
  const customerId = config.customer_id
  const developerToken = decryptSecret(config.developer_token_enc)
  const loginCustomerId = config.login_customer_id
  const accessToken = await getGoogleAccessToken(config)

  if (!customerId || !developerToken || !accessToken) {
    return { campaigns: [], metrics: { impressions: 0, clicks: 0, cost: 0, conversions: 0 } }
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    'developer-token': developerToken,
  }
  if (loginCustomerId)
    headers['login-customer-id'] = loginCustomerId

  const dateWhere = buildGoogleDateWhere(dateOpts.datePreset, dateOpts.dateStart, dateOpts.dateEnd)
  const query = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      campaign.advertising_channel_type,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions
    FROM campaign
    WHERE ${dateWhere}
  `

  const response = await $fetch<any[]>(
    `https://googleads.googleapis.com/v19/customers/${customerId}/googleAds:searchStream`,
    {
      method: 'POST',
      headers,
      body: { query },
    },
  ).catch(() => [])

  const rows = Array.isArray(response)
    ? response.flatMap(chunk => chunk.results || [])
    : []

  const campaigns = rows.map((row: any) => ({
    id: row.campaign?.id,
    name: row.campaign?.name,
    status: row.campaign?.status,
    channel: row.campaign?.advertisingChannelType || row.campaign?.advertising_channel_type,
    impressions: Number(row.metrics?.impressions || 0),
    clicks: Number(row.metrics?.clicks || 0),
    cost: Number(row.metrics?.costMicros || row.metrics?.cost_micros || 0) / 1000000,
    conversions: Number(row.metrics?.conversions || 0),
  }))

  const metrics = campaigns.reduce(
    (acc: any, c: any) => {
      acc.impressions += c.impressions
      acc.clicks += c.clicks
      acc.cost += c.cost
      acc.conversions += c.conversions
      return acc
    },
    { impressions: 0, clicks: 0, cost: 0, conversions: 0 },
  )

  return { campaigns, metrics }
}

function parseMetaActionsResults(actions: any[] | undefined) {
  if (!Array.isArray(actions))
    return 0
  let sum = 0
  for (const a of actions) {
    const type = String(a?.action_type || '').toLowerCase()
    const val = Number(a?.value || 0)
    if (!val)
      continue
    if (
      type.includes('offsite_conversion')
      || type.includes('onsite_conversion')
      || type.includes('lead')
      || type.includes('purchase')
      || type.includes('complete_registration')
      || type.includes('submit_application')
    ) {
      sum += val
    }
  }
  if (sum > 0)
    return sum
  for (const a of actions) {
    const type = String(a?.action_type || '').toLowerCase()
    if (type === 'link_click' || type === 'post_engagement' || type === 'page_engagement')
      continue
    sum += Number(a?.value || 0)
  }
  return sum
}

function parsePurchaseRoas(roas: any): number | null {
  if (roas == null)
    return null
  if (typeof roas === 'number' && !Number.isNaN(roas))
    return roas
  const arr = Array.isArray(roas) ? roas : []
  for (const row of arr) {
    const v = Number(row?.value ?? row)
    if (v > 0)
      return v
  }
  return null
}

function mapCampaignInsightRow(item: any) {
  const impressions = Number(item.impressions || 0)
  const clicks = Number(item.clicks || 0)
  const spend = Number(item.spend || 0)
  const reach = Number(item.reach || 0)
  const ctrRaw = Number(item.ctr ?? (impressions > 0 ? (clicks / impressions) * 100 : 0))
  const cpc = Number(item.cpc || 0) || (clicks > 0 ? spend / clicks : 0)
  const cpm = Number(item.cpm || 0) || (impressions > 0 ? (spend / impressions) * 1000 : 0)
  const results = parseMetaActionsResults(item.actions)
  const roas = parsePurchaseRoas(item.purchase_roas)
  const costPerResult = results > 0 ? spend / results : 0

  return {
    id: item.campaign_id,
    name: item.campaign_name,
    impressions,
    clicks,
    spend,
    reach,
    ctr: ctrRaw,
    cpc,
    cpm,
    results,
    roas,
    cost_per_result: costPerResult,
  }
}

function mapDailyInsightRow(item: any) {
  const impressions = Number(item.impressions || 0)
  const clicks = Number(item.clicks || 0)
  const spend = Number(item.spend || 0)
  const reach = Number(item.reach || 0)
  const ctrRaw = Number(item.ctr ?? (impressions > 0 ? (clicks / impressions) * 100 : 0))
  const cpc = Number(item.cpc || 0) || (clicks > 0 ? spend / clicks : 0)
  const cpm = Number(item.cpm || 0) || (impressions > 0 ? (spend / impressions) * 1000 : 0)
  const results = parseMetaActionsResults(item.actions)
  const roas = parsePurchaseRoas(item.purchase_roas)
  const costPerResult = results > 0 ? spend / results : 0
  return {
    date: String(item.date_start || item.date_stop || ''),
    impressions,
    clicks,
    spend,
    reach,
    ctr: ctrRaw,
    cpc,
    cpm,
    results,
    cost_per_result: costPerResult,
    roas,
  }
}

function buildMetaDateQuery(
  datePreset: string,
  dateStart: string,
  dateEnd: string,
): Record<string, string> {
  if (datePreset === 'custom' && dateStart && dateEnd) {
    return {
      time_range: JSON.stringify({ since: dateStart, until: dateEnd }),
    }
  }
  if (datePreset === 'today' || datePreset === 'yesterday')
    return { date_preset: datePreset }
  const preset = ['last_7d', 'last_14d', 'last_30d', 'last_90d'].includes(datePreset)
    ? datePreset
    : 'last_30d'
  return { date_preset: preset }
}

/** Graph API sometimes returns nested objects as JSON strings */
function parseMaybeObject(v: unknown): Record<string, unknown> | null {
  if (v == null)
    return null
  if (typeof v === 'string') {
    try {
      const o = JSON.parse(v) as unknown
      return typeof o === 'object' && o != null ? (o as Record<string, unknown>) : null
    }
    catch {
      return null
    }
  }
  if (typeof v === 'object')
    return v as Record<string, unknown>
  return null
}

/** Prefer large preview URLs from object_story_spec (ex.: link ads picture) */
function bestUrlFromObjectStorySpec(oss: Record<string, unknown> | null): string | null {
  if (!oss)
    return null
  const ld = oss.link_data as Record<string, unknown> | undefined
  if (ld) {
    const pic = ld.picture
    if (typeof pic === 'string' && pic.startsWith('http'))
      return pic
    const children = ld.child_attachments
    if (Array.isArray(children)) {
      for (const ch of children) {
        const p = (ch as Record<string, unknown>)?.picture
        if (typeof p === 'string' && p.startsWith('http'))
          return p
      }
    }
  }
  const vd = oss.video_data as Record<string, unknown> | undefined
  if (vd) {
    const iu = vd.image_url
    if (typeof iu === 'string' && iu.startsWith('http'))
      return iu
  }
  const pd = oss.photo_data as Record<string, unknown> | undefined
  if (pd) {
    const u = pd.url
    if (typeof u === 'string' && u.startsWith('http'))
      return u
  }
  return null
}

/**
 * Resolve best display URL for a creative: ad library (hash) → object_story_spec → image_url → thumbnail.
 */
function resolveCreativePreviewImageUrl(
  creative: Record<string, unknown> | null | undefined,
  hashToUrl: Map<string, string>,
): string | null {
  if (!creative || typeof creative !== 'object')
    return null
  const hash = creative.image_hash != null ? String(creative.image_hash) : ''
  if (hash && hashToUrl.has(hash))
    return hashToUrl.get(hash) || null
  const oss = parseMaybeObject(creative.object_story_spec)
  const fromOss = bestUrlFromObjectStorySpec(oss)
  if (fromOss)
    return fromOss
  const iu = creative.image_url
  if (typeof iu === 'string' && iu.startsWith('http'))
    return iu
  const tu = creative.thumbnail_url
  if (typeof tu === 'string' && tu.startsWith('http'))
    return tu
  return null
}

/** Batch-fetch full-size / permalink URLs from Ad Library via image hashes */
async function fetchAdImageUrlsByHashes(
  accessToken: string,
  adAccountId: string,
  apiVersion: string,
  hashes: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  const unique = [...new Set(hashes.filter(Boolean))]
  if (!unique.length)
    return map
  const base = `https://graph.facebook.com/${apiVersion}/act_${adAccountId}/adimages`
  const chunkSize = 50
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize)
    try {
      const res = await $fetch<any>(base, {
        query: {
          hashes: JSON.stringify(chunk),
          fields: 'hash,url,permalink_url,original_width,original_height,width,height',
          access_token: accessToken,
        },
      })
      for (const row of res?.data || []) {
        const h = row?.hash != null ? String(row.hash) : ''
        const best = row?.permalink_url || row?.url
        if (h && typeof best === 'string' && best.startsWith('http'))
          map.set(h, best)
      }
    }
    catch {
      // Chunk may fail if hashes invalid; continue with fallbacks per ad
    }
  }
  return map
}

async function fetchMetaData(
  config: Record<string, any>,
  opts: {
    datePreset: string
    dateStart: string
    dateEnd: string
    adsActiveOnly: boolean
  },
) {
  const accessToken = decryptSecret(config.access_token_enc)
  const adAccountId = config.ad_account_id

  if (!accessToken || !adAccountId) {
    return {
      metrics: emptyMetaMetrics(),
      campaigns: [] as any[],
      ads: [] as any[],
      series: [] as any[],
    }
  }

  const apiVersion = config.api_version || 'v20.0'
  const base = `https://graph.facebook.com/${apiVersion}/act_${adAccountId}`
  const insightFields
    = 'campaign_id,campaign_name,impressions,clicks,spend,cpc,reach,ctr,cpm,actions,action_values,purchase_roas'
  const accountFields
    = 'impressions,clicks,spend,cpc,reach,ctr,cpm,actions,action_values,purchase_roas'

  const dateQ = buildMetaDateQuery(opts.datePreset, opts.dateStart, opts.dateEnd)

  const adsQuery: Record<string, string> = {
    fields:
      'id,name,campaign{id,name},effective_status,creative{image_url,thumbnail_url,image_hash,object_story_spec}',
    limit: '100',
    access_token: accessToken,
  }
  if (opts.adsActiveOnly) {
    adsQuery.filtering = JSON.stringify([
      { field: 'effective_status', operator: 'IN', value: ['ACTIVE'] },
    ])
  }

  const dailyInsightFields
    = 'impressions,clicks,spend,reach,cpc,ctr,cpm,actions,purchase_roas'

  const [accountRes, campaignRes, adsResponse, campMetaRes, dailyRes, adLevelInsights] = await Promise.all([
    $fetch<any>(`${base}/insights`, {
      query: {
        fields: accountFields,
        access_token: accessToken,
        ...dateQ,
      },
    }).catch(() => ({ data: [] })),
    $fetch<any>(`${base}/insights`, {
      query: {
        level: 'campaign',
        fields: insightFields,
        access_token: accessToken,
        ...dateQ,
      },
    }).catch(() => ({ data: [] })),
    $fetch<any>(`${base}/ads`, {
      query: adsQuery,
    }).catch(() => ({ data: [] })),
    $fetch<any>(`${base}/campaigns`, {
      query: {
        fields: 'id,name,status',
        limit: 200,
        access_token: accessToken,
      },
    }).catch(() => ({ data: [] })),
    $fetch<any>(`${base}/insights`, {
      query: {
        fields: dailyInsightFields,
        time_increment: '1',
        access_token: accessToken,
        ...dateQ,
        limit: '90',
      },
    }).catch(() => ({ data: [] })),
    $fetch<any>(`${base}/insights`, {
      query: {
        level: 'ad',
        fields: 'ad_id,impressions,clicks,spend,ctr,cpc,cpm',
        access_token: accessToken,
        ...dateQ,
        limit: '200',
      },
    }).catch(() => ({ data: [] })),
  ])

  const statusById = new Map<string, string>()
  for (const c of (campMetaRes?.data || [])) {
    statusById.set(String(c.id), String(c.status || ''))
  }

  const accountRow = (accountRes?.data || [])[0] || {}
  const campaigns = (campaignRes?.data || []).map((item: any) => {
    const row = mapCampaignInsightRow(item) as Record<string, any>
    row.status = statusById.get(String(row.id)) || null
    return row
  })

  const impressions = Number(accountRow.impressions || 0)
  const clicks = Number(accountRow.clicks || 0)
  const spend = Number(accountRow.spend || 0)
  const reach = Number(accountRow.reach || 0)
  const ctr = Number(accountRow.ctr ?? (impressions > 0 ? (clicks / impressions) * 100 : 0))
  const cpc = Number(accountRow.cpc || 0) || (clicks > 0 ? spend / clicks : 0)
  const cpm = Number(accountRow.cpm || 0) || (impressions > 0 ? (spend / impressions) * 1000 : 0)
  const results = parseMetaActionsResults(accountRow.actions)
  const roas = parsePurchaseRoas(accountRow.purchase_roas)
  const costPerResult = results > 0 ? spend / results : 0

  const metrics = {
    impressions,
    clicks,
    spend,
    reach,
    ctr,
    cpc,
    cpm,
    results,
    roas,
    cost_per_result: costPerResult,
  }

  const adMetricsById = new Map<string, {
    impressions: number
    clicks: number
    spend: number
    ctr: number
    cpc: number
    cpm: number
  }>()
  for (const row of adLevelInsights?.data || []) {
    const aid = row?.ad_id != null ? String(row.ad_id) : ''
    if (!aid)
      continue
    adMetricsById.set(aid, {
      impressions: Number(row.impressions || 0),
      clicks: Number(row.clicks || 0),
      spend: Number(row.spend || 0),
      ctr: Number(row.ctr ?? 0),
      cpc: Number(row.cpc || 0),
      cpm: Number(row.cpm || 0),
    })
  }

  const rawAds = adsResponse?.data || []
  const creativeHashes = rawAds
    .map((ad: any) => ad.creative?.image_hash)
    .filter((h: unknown) => h != null && String(h).length > 0)
    .map((h: unknown) => String(h))
  const hashToUrl = await fetchAdImageUrlsByHashes(accessToken, adAccountId, apiVersion, creativeHashes)

  const ads = rawAds.map((ad: any) => {
    const m = adMetricsById.get(String(ad.id))
    const creative = ad.creative as Record<string, unknown> | undefined
    const image_url = resolveCreativePreviewImageUrl(creative, hashToUrl)
    return {
      id: ad.id,
      name: ad.name,
      campaign_id: ad.campaign?.id ? String(ad.campaign.id) : null,
      campaign_name: ad.campaign?.name || null,
      effective_status: ad.effective_status ? String(ad.effective_status) : null,
      image_url,
      impressions: m?.impressions ?? null,
      clicks: m?.clicks ?? null,
      spend: m?.spend ?? null,
      ctr: m?.ctr ?? null,
      cpc: m?.cpc ?? null,
      cpm: m?.cpm ?? null,
    }
  })

  const series = (dailyRes?.data || []).map((row: any) => mapDailyInsightRow(row))

  return { campaigns, metrics, ads, series }
}

function emptyMetaMetrics() {
  return {
    impressions: 0,
    clicks: 0,
    spend: 0,
    reach: 0,
    ctr: 0,
    cpc: 0,
    cpm: 0,
    results: 0,
    roas: null as number | null,
    cost_per_result: 0,
  }
}

function parseDatePresetQuery(query: Record<string, unknown>) {
  let datePreset = String(query.date_preset || 'last_30d')
  const dateStart = String(query.date_start || '').trim()
  const dateEnd = String(query.date_end || '').trim()
  const iso = /^\d{4}-\d{2}-\d{2}$/

  if (datePreset === 'custom') {
    if (!iso.test(dateStart) || !iso.test(dateEnd) || dateStart > dateEnd)
      datePreset = 'last_30d'
  }
  else if (
    ![
      'last_7d',
      'last_14d',
      'last_30d',
      'last_90d',
      'custom',
      'today',
      'yesterday',
    ].includes(datePreset)
  ) {
    datePreset = 'last_30d'
  }

  const metaAdsActiveOnly
    = query.meta_ads_active_only === 'true' || query.meta_ads_active_only === '1'

  const periodKey
    = datePreset === 'custom' && dateStart && dateEnd
      ? `custom:${dateStart}:${dateEnd}`
      : datePreset

  return {
    datePreset,
    dateStart: datePreset === 'custom' ? dateStart : '',
    dateEnd: datePreset === 'custom' ? dateEnd : '',
    metaAdsActiveOnly,
    periodKey,
  }
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const source = (query.source as string) || 'all'
  const googleTemplate = (query.google_template as string) || 'standard'
  const forceRefresh = query.force_refresh === 'true'

  const {
    datePreset,
    dateStart,
    dateEnd,
    metaAdsActiveOnly,
    periodKey,
  } = parseDatePresetQuery(query as Record<string, unknown>)

  const { tenantId } = await resolveMarketingTenantContext(event, query.tenant_id as string | undefined)
  const client = await serverSupabaseServiceRole(event)

  const { data: integrations, error } = await client
    .from('marketing_integrations')
    .select('provider, config, is_active, updated_at')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  const cacheKey = buildMarketingOverviewCacheKey(
    source,
    googleTemplate,
    periodKey,
    metaAdsActiveOnly,
    integrations || [],
  )

  if (!forceRefresh) {
    const cached = await getCachedMarketingData(client, tenantId, source as any, cacheKey)
    if (cached) {
      return { data: cached, cached: true }
    }
  }

  const googleConfig
    = integrations?.find((row: any) => row.provider === 'google_ads')?.config
      || integrations?.find((row: any) => row.provider === 'google')?.config
      || null
  const metaConfig = integrations?.find((row: any) => row.provider === 'meta')?.config || null

  const shouldLoadGoogle = source === 'all' || source === 'google_ads'
  const shouldLoadMeta = source === 'all' || source === 'meta'

  const dateOpts = { datePreset, dateStart, dateEnd }

  const [googleData, metaData] = await Promise.all([
    shouldLoadGoogle && googleConfig ? fetchGoogleData(googleConfig, dateOpts) : Promise.resolve(null),
    shouldLoadMeta && metaConfig
      ? fetchMetaData(metaConfig, { ...dateOpts, adsActiveOnly: metaAdsActiveOnly })
      : Promise.resolve(null),
  ])

  const googleCampaigns = googleData?.campaigns || []
  const localBusiness = googleCampaigns.filter((c: any) => String(c.channel).toLowerCase().includes('local'))
  const websiteVisits = googleCampaigns.filter((c: any) => !String(c.channel).toLowerCase().includes('local'))
  const selectedGoogleCampaigns
    = googleTemplate === 'local_business'
      ? localBusiness
      : googleTemplate === 'website_visits'
        ? websiteVisits
        : googleCampaigns

  const payload = {
    source,
    google_template: googleTemplate,
    period: {
      preset: datePreset,
      date_start: datePreset === 'custom' ? dateStart : null,
      date_end: datePreset === 'custom' ? dateEnd : null,
      meta_ads_active_only: metaAdsActiveOnly,
    },
    google: {
      metrics: googleData?.metrics || { impressions: 0, clicks: 0, cost: 0, conversions: 0 },
      campaigns: selectedGoogleCampaigns,
      templates: {
        local_business: localBusiness,
        website_visits: websiteVisits,
        standard: googleCampaigns,
      },
    },
    meta: {
      metrics: metaData?.metrics || emptyMetaMetrics(),
      campaigns: metaData?.campaigns || [],
      ads: metaData?.ads || [],
      series: metaData?.series || [],
    },
  }

  await setCachedMarketingData(client, tenantId, source as any, cacheKey, payload, 30)

  return { data: payload, cached: false }
})
