<script setup lang="ts">
import { LineChart } from '@/components/ui/chart-line'

import MetaAdsBoard from '@/components/dashboard/MetaAdsBoard.vue'
import { DateRangePicker } from '@/components/ui/date-range-picker'

import type { DashboardDatePreset, GoogleTemplateType } from '~/types/dashboard'

const { tenantId } = useTenant()
const source = ref<'all' | 'google_ads' | 'meta'>('all')
const googleTemplate = ref<GoogleTemplateType>('standard')

const datePreset = ref<DashboardDatePreset | string>('last_30d')
const dateStart = ref('')
const dateEnd = ref('')
const metaAdsActiveOnly = ref(false)

watch(datePreset, (v) => {
  if (v === 'custom' && !dateStart.value) {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - 30)
    dateEnd.value = end.toISOString().slice(0, 10)
    dateStart.value = start.toISOString().slice(0, 10)
  }
})

definePageMeta({
  middleware: ['auth'],
  title: 'Painel de Campanhas',
})

function overviewQuery() {
  const q: Record<string, string | undefined> = {
    source: source.value,
    google_template: googleTemplate.value,
    tenant_id: tenantId.value || undefined,
    date_preset: datePreset.value,
    meta_ads_active_only: metaAdsActiveOnly.value ? 'true' : 'false',
  }
  if (datePreset.value === 'custom') {
    q.date_start = dateStart.value
    q.date_end = dateEnd.value
  }
  return q
}

const { data, pending, refresh } = await useAsyncData(
  () =>
    `dashboard-overview-${tenantId.value}-${source.value}-${googleTemplate.value}-${datePreset.value}-${dateStart.value}-${dateEnd.value}-${metaAdsActiveOnly.value}`,
  async () => {
    const response = await $fetch<{ data: any }>('/api/dashboard/overview', {
      query: overviewQuery(),
    })
    return response.data
  },
  {
    watch: [tenantId, source, googleTemplate, datePreset, dateStart, dateEnd, metaAdsActiveOnly],
  },
)

const googleChartData = computed(() => {
  return (data.value?.google?.campaigns || []).slice(0, 10).map((campaign: any, idx: number) => ({
    campanha: campaign.name || `Campanha ${idx + 1}`,
    cliques: Number(campaign.clicks || 0),
    'conversões': Number(campaign.conversions || 0),
  }))
})

const showGoogleBlock = computed(() => source.value === 'all' || source.value === 'google_ads')
const showMetaBlock = computed(() => source.value === 'all' || source.value === 'meta')
</script>

<template>
  <div class="w-full flex flex-col gap-6">
    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 class="text-2xl font-bold">
          Dashboard de Marketing
        </h1>
        <p class="text-muted-foreground">
          Visão geral das campanhas de Google Ads e Meta Ads.
        </p>
      </div>

      <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div class="flex flex-wrap items-center gap-2">
          <Label class="text-xs text-muted-foreground whitespace-nowrap">Período</Label>
          <Select v-model="datePreset">
            <SelectTrigger class="w-[180px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">
                Hoje
              </SelectItem>
              <SelectItem value="yesterday">
                Ontem
              </SelectItem>
              <SelectItem value="last_7d">
                Últimos 7 dias
              </SelectItem>
              <SelectItem value="last_14d">
                Últimos 14 dias
              </SelectItem>
              <SelectItem value="last_30d">
                Últimos 30 dias
              </SelectItem>
              <SelectItem value="last_90d">
                Últimos 90 dias
              </SelectItem>
              <SelectItem value="custom">
                Período personalizado
              </SelectItem>
            </SelectContent>
          </Select>
          <DateRangePicker
            v-if="datePreset === 'custom'"
            v-model:start="dateStart"
            v-model:end="dateEnd"
            class="shrink-0"
          />
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <Select v-model="source">
            <SelectTrigger class="w-[180px]">
              <SelectValue placeholder="Fonte" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                Todas as fontes
              </SelectItem>
              <SelectItem value="google_ads">
                Google
              </SelectItem>
              <SelectItem value="meta">
                Meta
              </SelectItem>
            </SelectContent>
          </Select>

          <Select v-if="showGoogleBlock" v-model="googleTemplate">
            <SelectTrigger class="w-[220px]">
              <SelectValue placeholder="Template Google" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">
                Campanhas padrão
              </SelectItem>
              <SelectItem value="local_business">
                Template negócio local
              </SelectItem>
              <SelectItem value="website_visits">
                Template visitas no site
              </SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" :disabled="pending" @click="refresh">
            <Icon name="lucide:refresh-cw" class="mr-2 h-4 w-4" />
            Atualizar
          </Button>
        </div>
      </div>
    </div>

    <div v-if="showGoogleBlock" class="grid gap-4 xl:grid-cols-1">
      <Card>
        <CardHeader>
          <CardTitle>Desempenho das Campanhas Google</CardTitle>
          <CardDescription>Principais campanhas por cliques e conversões (mesmo período selecionado acima).</CardDescription>
        </CardHeader>
        <CardContent>
          <LineChart
            :data="googleChartData"
            :categories="['cliques', 'conversões']"
            index="campanha"
            :show-legend="true"
          />
        </CardContent>
      </Card>
    </div>

    <MetaAdsBoard
      v-if="showMetaBlock"
      v-model:ads-active-only="metaAdsActiveOnly"
      :meta="data?.meta"
      :period="data?.period"
    />
  </div>
</template>
