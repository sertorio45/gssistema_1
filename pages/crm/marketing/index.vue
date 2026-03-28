<script setup lang="ts">
import { LineChart } from '@/components/ui/chart-line'

import GoogleAnalyticsBrandIcon from '@/components/brand/GoogleAnalyticsBrandIcon.vue'
import MarketingReportTemplateSidebar from '@/components/marketing/MarketingReportTemplateSidebar.vue'
import type { MarketingReportSource } from '@/components/marketing/MarketingReportTemplateSidebar.vue'
import MetaAdsBoard from '@/components/marketing/MetaAdsBoard.vue'
import { DateRangePicker } from '@/components/ui/date-range-picker'

import type { MarketingDatePreset, GoogleTemplateType } from '~/types/marketing'

const { tenantId } = useTenant()
const source = ref<MarketingReportSource>('google_ads')
const googleTemplate = ref<GoogleTemplateType>('standard')

const datePreset = ref<MarketingDatePreset | string>('last_30d')
const dateStart = ref('')
const dateEnd = ref('')
const metaAdsActiveOnly = ref(true)

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
    `marketing-overview-${tenantId.value}-${source.value}-${googleTemplate.value}-${datePreset.value}-${dateStart.value}-${dateEnd.value}-${metaAdsActiveOnly.value}`,
  async () => {
    const response = await $fetch<{ data: any }>('/api/marketing/overview', {
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

const showGoogleAdsBlock = computed(() => source.value === 'google_ads')
const showAnalyticsBlock = computed(() => source.value === 'google_analytics')
const showMetaBlock = computed(() => source.value === 'meta')

const metaBoardRef = ref<{ refreshCreatives: () => Promise<void> } | null>(null)

async function refreshMarketing() {
  await refresh()
  await metaBoardRef.value?.refreshCreatives?.()
}
</script>

<template>
  <div class="w-full flex flex-col gap-6">
    <div>
      <h1 class="text-2xl font-bold">
        Dashboard de Marketing
      </h1>
      <p class="text-muted-foreground">
        Visão geral das campanhas de Google Ads e Meta Ads.
      </p>
    </div>

    <div class="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
      <MarketingReportTemplateSidebar
        v-model="source"
        class="md:sticky md:top-4 md:self-start"
      />

      <div class="min-w-0 flex flex-1 flex-col gap-6">
        <div class="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-center md:justify-between">
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
            <Select v-if="showGoogleAdsBlock" v-model="googleTemplate">
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

            <Button variant="outline" :disabled="pending" @click="refreshMarketing">
              <Icon name="lucide:refresh-cw" class="mr-2 h-4 w-4" />
              Atualizar
            </Button>
          </div>
        </div>

        <div v-if="showGoogleAdsBlock" class="grid gap-4 xl:grid-cols-1">
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

        <div v-if="showAnalyticsBlock" class="grid gap-4 xl:grid-cols-1">
          <Card>
            <CardHeader>
              <div class="flex items-start gap-3">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center">
                  <GoogleAnalyticsBrandIcon size="lg" />
                </div>
                <div>
                  <CardTitle>Google Analytics</CardTitle>
                  <CardDescription>
                    Relatórios de propriedade e tráfego serão exibidos aqui quando a integração estiver ativa.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p class="text-sm text-muted-foreground">
                Configure o Google Analytics em Integrações para habilitar este painel.
              </p>
            </CardContent>
          </Card>
        </div>

        <MetaAdsBoard
          v-if="showMetaBlock"
          ref="metaBoardRef"
          v-model:ads-active-only="metaAdsActiveOnly"
          :meta="data?.meta"
          :period="data?.period"
        />
      </div>
    </div>
  </div>
</template>
