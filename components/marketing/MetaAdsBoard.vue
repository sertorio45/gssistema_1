<script setup lang="ts">
import type { MarketingOverviewPeriod, MetaAdCreative, MetaOverviewBlock, MetaSeriesPoint } from '~/types/marketing'
import type { MetaAdCreativePayload } from '~/types/meta-creatives'

import MetaBrandIcon from '@/components/brand/MetaBrandIcon.vue'
import MetaCreativeMediaViewer from '@/components/marketing/MetaCreativeMediaViewer.vue'
import MiniSparkline from '@/components/marketing/MiniSparkline.vue'
import { Switch } from '@/components/ui/switch'

const props = defineProps<{
  meta?: MetaOverviewBlock | null
  period?: MarketingOverviewPeriod | null
}>()

const { tenantId } = useTenant()

const adsActiveOnly = defineModel<boolean>('adsActiveOnly', { default: true })

const selectedCampaignId = ref<string | 'all'>('all')
const activeCampaignsOnly = ref(true)

const periodLabel = computed(() => {
  const p = props.period
  if (!p)
    return ''
  if (p.preset === 'custom' && p.date_start && p.date_end)
    return `${p.date_start} → ${p.date_end}`
  const labels: Record<string, string> = {
    today: 'Hoje',
    yesterday: 'Ontem',
    last_7d: 'Últimos 7 dias',
    last_14d: 'Últimos 14 dias',
    last_30d: 'Últimos 30 dias',
    last_90d: 'Últimos 90 dias',
  }
  return labels[p.preset] || p.preset
})

function metaStatusPt(status: string | null | undefined) {
  if (!status)
    return ''
  const u = status.toUpperCase()
  const map: Record<string, string> = {
    ACTIVE: 'Ativo',
    PAUSED: 'Pausado',
    ARCHIVED: 'Arquivado',
    DELETED: 'Excluído',
    IN_PROCESS: 'Em processamento',
    WITH_ISSUES: 'Com problemas',
    DISAPPROVED: 'Reprovado',
    PENDING_REVIEW: 'Em análise',
    PREAPPROVED: 'Pré-aprovado',
    PENDING_BILLING_INFO: 'Aguardando faturamento',
    CAMPAIGN_PAUSED: 'Campanha pausada',
    ADSET_PAUSED: 'Conjunto pausado',
  }
  return map[u] || status
}

const campaigns = computed(() => props.meta?.campaigns ?? [])

const campaignSelectOptions = computed(() => {
  let list = [...campaigns.value]
  if (activeCampaignsOnly.value)
    list = list.filter(c => String(c.status || '').toUpperCase() === 'ACTIVE')
  return list
})

const displayMetrics = computed(() => {
  const m = props.meta?.metrics
  if (!m) {
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
  if (selectedCampaignId.value === 'all')
    return m

  const row = campaigns.value.find(c => String(c.id) === String(selectedCampaignId.value))
  return row
    ? {
        impressions: row.impressions,
        clicks: row.clicks,
        spend: row.spend,
        reach: row.reach,
        ctr: row.ctr,
        cpc: row.cpc,
        cpm: row.cpm,
        results: row.results,
        roas: row.roas,
        cost_per_result: row.cost_per_result,
      }
    : m
})

const accountSeries = computed(() => props.meta?.series ?? [])

function valuesFromSeries(key: keyof MetaSeriesPoint): number[] {
  const s = accountSeries.value
  if (s.length >= 2) {
    return s.map((p) => {
      const v = p[key]
      if (typeof v === 'number')
        return v
      return v == null ? 0 : Number(v)
    })
  }
  const m = displayMetrics.value
  const fallback = (() => {
    switch (key) {
      case 'spend':
        return m.spend
      case 'results':
        return m.results
      case 'cost_per_result':
        return m.cost_per_result
      case 'reach':
        return m.reach
      case 'impressions':
        return m.impressions
      case 'clicks':
        return m.clicks
      case 'ctr':
        return m.ctr
      case 'cpc':
        return m.cpc
      case 'cpm':
        return m.cpm
      case 'roas':
        return m.roas ?? 0
      default:
        return 0
    }
  })()
  const v = Number(fallback) || 0
  return [v * 0.88, v * 0.94, v * 0.97, v, v * 1.02]
}

function trendHalf(values: number[]): number | null {
  if (values.length < 4)
    return null
  const mid = Math.floor(values.length / 2)
  const a = values.slice(0, mid).reduce((s, x) => s + x, 0) / mid
  const b = values.slice(mid).reduce((s, x) => s + x, 0) / (values.length - mid)
  if (a === 0 && b === 0)
    return null
  const base = Math.abs(a) < 1e-9 ? (Math.abs(b) < 1e-9 ? 1 : b) : a
  return ((b - a) / base) * 100
}

/** Para métricas de custo, tendência negativa (queda) é favorável */
function trendVisual(pct: number | null, invert: boolean) {
  if (pct == null || Number.isNaN(pct))
    return { icon: null as string | null, label: '' }
  const effective = invert ? -pct : pct
  const icon = effective >= 0 ? 'lucide:trending-up' : 'lucide:trending-down'
  const label = `${effective >= 0 ? '+' : ''}${effective.toFixed(0)}%`
  return { icon, label }
}

const sparkSpend = computed(() => valuesFromSeries('spend'))
const sparkResults = computed(() => valuesFromSeries('results'))
const sparkCostPerResult = computed(() => valuesFromSeries('cost_per_result'))

const trendResultsVisual = computed(() => trendVisual(trendHalf(sparkResults.value), false))
const trendCostVisual = computed(() => trendVisual(trendHalf(sparkCostPerResult.value), true))

const metricGridItems = computed(() => [
  { key: 'reach', label: 'Alcance', spark: 'reach' as const, muted: false },
  { key: 'impressions', label: 'Impressões', spark: 'impressions' as const, muted: false },
  { key: 'clicks', label: 'Cliques', spark: 'clicks' as const, muted: false },
  { key: 'cpc', label: 'CPC', spark: 'cpc' as const, muted: true },
  { key: 'ctr', label: 'CTR', spark: 'ctr' as const, muted: false },
  { key: 'cpm', label: 'CPM', spark: 'cpm' as const, muted: true },
  { key: 'roas', label: 'ROAS', spark: 'roas' as const, muted: true },
])

function formatMetricValue(key: string) {
  const m = displayMetrics.value
  switch (key) {
    case 'reach':
      return fmtInt(m.reach)
    case 'impressions':
      return fmtInt(m.impressions)
    case 'clicks':
      return fmtInt(m.clicks)
    case 'cpc':
      return fmtCurrency(m.cpc)
    case 'ctr':
      return `${fmtDec(m.ctr, 2)}%`
    case 'cpm':
      return fmtCurrency(m.cpm)
    case 'roas':
      return m.roas != null && m.roas > 0 ? `${fmtDec(m.roas, 2)}x` : '—'
    default:
      return '—'
  }
}

const { data: creativesRes, pending: creativesPending, refresh: refreshCreatives } = await useAsyncData(
  () => `meta-creatives-${tenantId.value}-${adsActiveOnly.value}`,
  () =>
    $fetch<{ data: MetaAdCreativePayload[], api_version: string }>('/api/marketing/creatives', {
      query: {
        tenant_id: tenantId.value || undefined,
        ads_active_only: adsActiveOnly.value ? 'true' : 'false',
      },
    }),
  { watch: [tenantId, adsActiveOnly] },
)

const metricsByAdId = computed(() => {
  const m = new Map<string, MetaAdCreative>()
  for (const a of props.meta?.ads ?? [])
    m.set(String(a.id), a)
  return m
})

const viewerOpen = ref(false)
const viewerCreative = ref<MetaAdCreativePayload | null>(null)

function openViewer(c: MetaAdCreativePayload) {
  viewerCreative.value = c
  viewerOpen.value = true
}

watch(viewerOpen, (v) => {
  if (!v)
    viewerCreative.value = null
})

/** Criativos em alta resolução + métricas do overview (mesmo período) */
const creativeRows = computed(() => {
  const list = creativesRes.value?.data ?? []
  return list
    .map((c) => {
      const metrics = metricsByAdId.value.get(String(c.ad_id))
      return { creative: c, metrics }
    })
    .filter((row) => {
      if (selectedCampaignId.value === 'all')
        return true
      const cid = row.metrics?.campaign_id
      return cid != null && String(cid) === String(selectedCampaignId.value)
    })
    .slice(0, 12)
})

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n || 0)
}

function fmtInt(n: number) {
  return Math.round(n || 0).toLocaleString('pt-BR')
}

function fmtDec(n: number, d = 2) {
  return (n || 0).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })
}

watch(
  () => campaigns.value.map(c => c.id).join(','),
  () => {
    if (
      selectedCampaignId.value !== 'all'
      && !campaigns.value.some(c => String(c.id) === String(selectedCampaignId.value))
    ) {
      selectedCampaignId.value = 'all'
    }
  },
)

watch(activeCampaignsOnly, () => {
  if (selectedCampaignId.value === 'all')
    return
  if (!campaignSelectOptions.value.some(c => String(c.id) === String(selectedCampaignId.value)))
    selectedCampaignId.value = 'all'
})

defineExpose({
  refreshCreatives,
})
</script>

<template>
  <Card class="overflow-hidden">
    <CardHeader class="border-b">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <CardTitle class="flex items-center gap-2 text-base font-semibold">
            <span class="flex h-9 w-9 items-center justify-center rounded-md border bg-muted/40 text-[#0866FF]">
              <MetaBrandIcon size="sm" />
            </span>
            Anúncios Meta
          </CardTitle>
          <CardDescription class="mt-1">
            <span v-if="periodLabel">Desempenho · {{ periodLabel }}</span>
            <span v-else>Visão geral do desempenho dos anúncios. Filtre por campanha para atualizar indicadores e criativos.</span>
          </CardDescription>
          <p
            v-if="selectedCampaignId !== 'all' && accountSeries.length"
            class="mt-2 text-xs text-muted-foreground"
          >
            Os mini gráficos usam dados diários da conta; os números refletem a campanha selecionada.
          </p>
        </div>

        <div class="flex w-full flex-col gap-4 lg:max-w-lg lg:shrink-0">
          <div class="flex flex-col gap-2">
            <Label for="meta-campaign" class="text-xs font-medium text-muted-foreground">
              Campanha
            </Label>
            <Select v-model="selectedCampaignId">
              <SelectTrigger id="meta-campaign" class="w-full min-w-0">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  Todas
                </SelectItem>
                <SelectItem
                  v-for="c in campaignSelectOptions"
                  :key="String(c.id)"
                  :value="String(c.id)"
                >
                  {{ c.name || c.id }}
                  <span v-if="c.status" class="text-muted-foreground"> · {{ metaStatusPt(c.status) }}</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
            <div
              class="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/25 px-3 py-2.5 shadow-sm"
            >
              <Label
                for="meta-ads-active"
                class="cursor-pointer text-sm font-medium leading-tight text-foreground"
              >
                Anúncios ativos
              </Label>
              <Switch id="meta-ads-active" v-model:checked="adsActiveOnly" />
            </div>
            <div
              class="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/25 px-3 py-2.5 shadow-sm"
            >
              <Label
                for="meta-campaigns-active"
                class="cursor-pointer text-sm font-medium leading-tight text-foreground"
              >
                Campanhas ativas
              </Label>
              <Switch id="meta-campaigns-active" v-model:checked="activeCampaignsOnly" />
            </div>
          </div>
        </div>
      </div>
    </CardHeader>

    <CardContent class="p-0">
      <!-- Métricas principais -->
      <div class="border-b px-4 py-4 sm:px-6">
        <div class="grid gap-4 lg:grid-cols-3">
          <div class="flex flex-col justify-between gap-3 rounded-lg border bg-card p-4">
            <div class="flex items-start justify-between gap-2">
              <div>
                <p class="text-xs font-medium text-muted-foreground">
                  Investimento
                </p>
                <p class="mt-1 text-2xl font-semibold tabular-nums">
                  {{ fmtCurrency(displayMetrics.spend) }}
                </p>
              </div>
              <span class="rounded-md border bg-muted/30 p-2 text-muted-foreground">
                <Icon name="lucide:wallet" class="h-4 w-4" />
              </span>
            </div>
            <MiniSparkline :values="sparkSpend" />
          </div>

          <div class="flex flex-col justify-between gap-3 rounded-lg border bg-card p-4">
            <div class="flex items-start justify-between gap-2">
              <div>
                <p class="text-xs font-medium text-muted-foreground">
                  Resultados
                </p>
                <p class="mt-1 text-2xl font-semibold tabular-nums">
                  {{ fmtDec(displayMetrics.results, 0) }}
                </p>
                <div
                  v-if="trendResultsVisual.icon"
                  class="mt-1 flex items-center gap-1 text-xs text-muted-foreground"
                >
                  <Icon :name="trendResultsVisual.icon!" class="h-3.5 w-3.5" />
                  {{ trendResultsVisual.label }}
                </div>
              </div>
              <span class="rounded-md border bg-muted/30 p-2 text-muted-foreground">
                <Icon name="lucide:target" class="h-4 w-4" />
              </span>
            </div>
            <MiniSparkline :values="sparkResults" />
          </div>

          <div class="flex flex-col justify-between gap-3 rounded-lg border bg-card p-4">
            <div class="flex items-start justify-between gap-2">
              <div>
                <p class="text-xs font-medium text-muted-foreground">
                  Custo / resultado
                </p>
                <p class="mt-1 text-2xl font-semibold tabular-nums">
                  {{
                    displayMetrics.results > 0
                      ? fmtCurrency(displayMetrics.cost_per_result)
                      : '—'
                  }}
                </p>
                <div
                  v-if="displayMetrics.results > 0 && trendCostVisual.icon"
                  class="mt-1 flex items-center gap-1 text-xs text-muted-foreground"
                >
                  <Icon
                    :name="trendCostVisual.icon!"
                    class="h-3.5 w-3.5"
                  />
                  {{ trendCostVisual.label }}
                </div>
              </div>
              <span class="rounded-md border bg-muted/30 p-2 text-muted-foreground">
                <Icon name="lucide:coins" class="h-4 w-4" />
              </span>
            </div>
            <MiniSparkline tone="muted" :values="sparkCostPerResult" />
          </div>
        </div>
      </div>

      <!-- Grade de métricas -->
      <div class="border-b px-4 py-4 sm:px-6">
        <p class="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Detalhamento
        </p>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div
            v-for="item in metricGridItems"
            :key="item.key"
            class="flex min-h-[100px] flex-col justify-between gap-2 rounded-lg border bg-card p-3"
          >
            <div>
              <p class="text-xs font-medium text-muted-foreground">
                {{ item.label }}
              </p>
              <p class="mt-1 text-lg font-semibold tabular-nums">
                {{ formatMetricValue(item.key) }}
              </p>
            </div>
            <MiniSparkline
              :tone="item.muted ? 'muted' : 'primary'"
              :values="valuesFromSeries(item.spark)"
            />
          </div>
        </div>
      </div>

      <!-- Criativos -->
      <div class="bg-muted/10 px-4 py-5 sm:px-6">
        <MetaCreativeMediaViewer v-model="viewerOpen" :creative="viewerCreative" />

        <div class="mb-4">
          <h3 class="text-sm font-semibold">
            Criativos dos anúncios
          </h3>
          <p class="text-xs text-muted-foreground">
            Mídias em alta resolução (Graph API {{ creativesRes?.api_version || 'v23.0' }}). Métricas no período selecionado.
          </p>
        </div>

        <div v-if="creativesPending" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <div v-for="n in 4" :key="n" class="h-48 animate-pulse rounded-lg border bg-muted/40" />
        </div>

        <div v-else class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <div
            v-for="row in creativeRows"
            :key="row.creative.ad_id"
            class="group overflow-hidden rounded-lg border bg-card shadow-sm transition hover:bg-muted/20"
          >
            <div class="relative aspect-video w-full overflow-hidden bg-muted">
              <img
                v-if="row.creative.preview_thumbnail || row.metrics?.image_url"
                :src="row.creative.preview_thumbnail || row.metrics?.image_url || ''"
                :alt="row.creative.ad_name || 'Anúncio'"
                loading="lazy"
                decoding="async"
                class="h-full w-full object-cover transition group-hover:scale-[1.02]"
              >
              <div
                v-else
                class="flex h-full w-full items-center justify-center text-muted-foreground"
              >
                <Icon name="lucide:image-off" class="h-8 w-8 opacity-40" />
              </div>
              <button
                type="button"
                class="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-md bg-black/45 text-white shadow-md backdrop-blur-[2px] transition hover:bg-black/55"
                :aria-label="'Ver mídia em tamanho ampliado'"
                @click.stop="openViewer(row.creative)"
              >
                <Icon name="lucide:eye" class="h-4 w-4" />
              </button>
            </div>
            <div class="space-y-2 p-3">
              <div class="mb-1 flex flex-wrap gap-1">
                <Badge v-if="row.metrics?.effective_status" variant="secondary" class="text-[10px]">
                  {{ metaStatusPt(row.metrics.effective_status) }}
                </Badge>
                <Badge variant="outline" class="text-[10px] capitalize">
                  {{ row.creative.creative_type }}
                </Badge>
              </div>
              <p class="line-clamp-2 text-sm font-medium leading-snug">
                {{ row.creative.ad_name || row.metrics?.name || 'Anúncio' }}
              </p>
              <p v-if="row.metrics?.campaign_name" class="line-clamp-1 text-xs text-muted-foreground">
                {{ row.metrics.campaign_name }}
              </p>
              <div class="flex flex-wrap items-center justify-between gap-2 border-t pt-2 text-xs tabular-nums">
                <span class="text-muted-foreground">CTR <span class="font-medium text-foreground">{{ row.metrics?.ctr != null ? `${fmtDec(row.metrics.ctr, 2)}%` : '—' }}</span></span>
                <span class="text-muted-foreground">Cliques <span class="font-medium text-foreground">{{ row.metrics?.clicks != null ? fmtInt(row.metrics.clicks) : '—' }}</span></span>
              </div>
              <div class="flex items-center justify-between text-xs">
                <span class="text-muted-foreground">Investimento</span>
                <span class="font-medium tabular-nums">{{ row.metrics?.spend != null ? fmtCurrency(row.metrics.spend) : '—' }}</span>
              </div>
            </div>
          </div>
        </div>
        <p v-if="!creativesPending && !creativeRows.length" class="py-8 text-center text-sm text-muted-foreground">
          Nenhum anúncio com criativos para este filtro.
        </p>
      </div>
    </CardContent>
  </Card>
</template>
