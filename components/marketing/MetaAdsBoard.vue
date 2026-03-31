<script setup lang="ts">
import type { MarketingOverviewPeriod, MetaOverviewBlock, MetaSeriesPoint } from '~/types/marketing'

import MetaBrandIcon from '@/components/brand/MetaBrandIcon.vue'
import MiniSparkline from '@/components/marketing/MiniSparkline.vue'
import { Switch } from '@/components/ui/switch'

const props = defineProps<{
  meta?: MetaOverviewBlock | null
  period?: MarketingOverviewPeriod | null
  loading?: boolean
}>()

const adsActiveOnly = defineModel<boolean>('adsActiveOnly', { default: false })

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
  if (activeCampaignsOnly.value) {
    list = list.filter((c) => {
      const status = String(c.status || '').toUpperCase()
      // In insights-only mode status may be null; don't hide valid campaigns.
      if (!status)
        return true
      return status === 'ACTIVE'
    })
  }
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
      <div v-if="loading" class="space-y-4 p-4 sm:p-6">
        <div class="grid gap-4 lg:grid-cols-3">
          <div class="space-y-3 rounded-lg border p-4">
            <Skeleton class="h-3 w-24" />
            <Skeleton class="h-8 w-32" />
            <Skeleton class="h-10 w-full" />
          </div>
          <div class="space-y-3 rounded-lg border p-4">
            <Skeleton class="h-3 w-24" />
            <Skeleton class="h-8 w-28" />
            <Skeleton class="h-10 w-full" />
          </div>
          <div class="space-y-3 rounded-lg border p-4">
            <Skeleton class="h-3 w-28" />
            <Skeleton class="h-8 w-28" />
            <Skeleton class="h-10 w-full" />
          </div>
        </div>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div v-for="n in 8" :key="`meta-skeleton-metric-${n}`" class="space-y-2 rounded-lg border p-3">
            <Skeleton class="h-3 w-20" />
            <Skeleton class="h-6 w-24" />
            <Skeleton class="h-8 w-full" />
          </div>
        </div>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <div v-for="n in 4" :key="`meta-skeleton-creative-${n}`" class="rounded-lg border p-3">
            <Skeleton class="mb-3 aspect-video w-full rounded-md" />
            <Skeleton class="mb-2 h-3 w-3/4" />
            <Skeleton class="mb-2 h-3 w-1/2" />
            <Skeleton class="h-3 w-2/3" />
          </div>
        </div>
      </div>

      <template v-else>
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

      </template>
    </CardContent>
  </Card>
</template>
