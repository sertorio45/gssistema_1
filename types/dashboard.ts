export type DashboardProvider = 'google_ads' | 'google_analytics' | 'meta'

export type GoogleTemplateType = 'local_business' | 'website_visits' | 'standard'

export interface DashboardIntegrationPayload {
  provider: DashboardProvider
  tenant_id?: string
  is_active?: boolean
  config: Record<string, any>
}

export type DashboardDatePreset =
  | 'today'
  | 'yesterday'
  | 'last_7d'
  | 'last_14d'
  | 'last_30d'
  | 'last_90d'
  | 'custom'

export interface DashboardOverviewQuery {
  tenant_id?: string
  source?: 'all' | 'google_ads' | 'meta'
  google_template?: GoogleTemplateType
  force_refresh?: boolean
  date_preset?: DashboardDatePreset | string
  date_start?: string
  date_end?: string
  meta_ads_active_only?: string | boolean
}

export interface MetaCampaignInsight {
  id: string
  name?: string
  status?: string | null
  impressions: number
  clicks: number
  spend: number
  reach: number
  ctr: number
  cpc: number
  cpm: number
  results: number
  roas: number | null
  cost_per_result: number
}

export interface MetaAdCreative {
  id: string
  name?: string
  campaign_id?: string | null
  campaign_name?: string | null
  effective_status?: string | null
  image_url?: string | null
  impressions?: number | null
  clicks?: number | null
  spend?: number | null
  ctr?: number | null
  cpc?: number | null
  cpm?: number | null
}

/** Daily (or per bucket) points for Meta account-level sparklines */
export interface MetaSeriesPoint {
  date: string
  impressions: number
  clicks: number
  spend: number
  reach: number
  ctr: number
  cpc: number
  cpm: number
  results: number
  cost_per_result: number
  roas: number | null
}

export interface DashboardOverviewPeriod {
  preset: string
  date_start: string | null
  date_end: string | null
  meta_ads_active_only: boolean
}

export interface MetaOverviewBlock {
  metrics: {
    impressions: number
    clicks: number
    spend: number
    reach: number
    ctr: number
    cpc: number
    cpm: number
    results: number
    roas: number | null
    cost_per_result: number
  }
  campaigns: MetaCampaignInsight[]
  ads: MetaAdCreative[]
  /** Account-level time series (Meta `time_increment=1`) */
  series?: MetaSeriesPoint[]
}
