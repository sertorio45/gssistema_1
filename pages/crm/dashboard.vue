<script setup lang="ts">
import type { Component } from 'vue'
import type { DashboardKPI } from '~/types/crm'

import { Avatar, AvatarFallback } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Skeleton } from '~/components/ui/skeleton'
import { useTenantPage } from '~/composables/useTenantPage'
import { useTenantTeam } from '~/composables/crm/useTenantTeam'

definePageMeta({
  middleware: ['auth'],
  title: 'Painel CRM',
  description: 'Visão geral do desempenho de vendas e métricas principais',
})

const emptyKpi: DashboardKPI = {
  totalLeads: 0,
  newLeadsThisMonth: 0,
  conversionRate: 0,
  totalRevenue: 0,
  revenueThisMonth: 0,
  averageDealSize: 0,
  negotiationValue: 0,
  leadsPerStage: [],
  revenueByMonth: [],
  topSources: [],
  topPerformers: [],
  recentActivity: [],
}

const { tenantId, whenTenantReady } = useTenantPage()
const { getMemberName } = useTenantTeam()

const {
  data: kpi,
  pending,
  refresh,
} = await useAsyncData(
  'crm-dashboard',
  async () => {
    if (!tenantId.value)
      return emptyKpi

    return await $fetch<DashboardKPI>('/api/crm/dashboard', {
      query: { tenant_id: tenantId.value },
    })
  },
  {
    watch: [tenantId],
    default: () => emptyKpi,
  },
)

whenTenantReady(() => {
  refresh()
})

const AreaChart = shallowRef<Component | null>(null)
const BarChart = shallowRef<Component | null>(null)

onMounted(async () => {
  const [areaModule, barModule] = await Promise.all([
    import('@/components/ui/chart-area'),
    import('@/components/ui/chart-bar'),
  ])
  AreaChart.value = areaModule.AreaChart
  BarChart.value = barModule.BarChart
})

const currency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
  }).format(value || 0)

const formattedRevenue = computed(() => currency(kpi.value.totalRevenue))
const formattedMonthlyRevenue = computed(() => currency(kpi.value.revenueThisMonth))
const formattedAverageDeal = computed(() => currency(kpi.value.averageDealSize))
const formattedNegotiation = computed(() => currency(kpi.value.negotiationValue))

const revenueChartData = computed(() =>
  kpi.value.revenueByMonth.map(item => ({
    month: item.month,
    receita: item.revenue,
  })),
)

const sourcesChartData = computed(() =>
  kpi.value.topSources.map(item => ({
    name: item.source,
    leads: item.count,
  })),
)

const maxStageCount = computed(() =>
  Math.max(1, ...kpi.value.leadsPerStage.map(stage => stage.count)),
)

const totalSourceCount = computed(() =>
  Math.max(1, kpi.value.topSources.reduce((sum, s) => sum + s.count, 0)),
)

function activityIcon(type: string) {
  if (type === 'won')
    return 'lucide:circle-check'
  if (type === 'created')
    return 'lucide:user-round-plus'
  return 'lucide:refresh-cw'
}

function formatRelativeTime(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime()))
    return ''

  const diffMs = Date.now() - date.getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1)
    return 'Agora'
  if (minutes < 60)
    return `Há ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24)
    return `Há ${hours}h`
  const days = Math.floor(hours / 24)
  if (days === 1)
    return 'Há 1 dia'
  if (days < 7)
    return `Há ${days} dias`
  return date.toLocaleDateString('pt-BR')
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || '')
    .join('')
}
</script>

<template>
  <div class="w-full flex flex-col items-stretch gap-6">
    <div class="flex items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">
          Painel CRM
        </h1>
        <p class="text-muted-foreground">
          Visão geral do desempenho de vendas e métricas principais
        </p>
      </div>
      <Button as-child>
        <NuxtLink to="/crm/funnel">
          <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
          Novo Lead
        </NuxtLink>
      </Button>
    </div>

    <!-- KPI Cards -->
    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle class="text-sm font-medium">
            Total de Leads
          </CardTitle>
          <Icon name="lucide:users" class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <Skeleton v-if="pending" class="h-8 w-20" />
          <template v-else>
            <div class="text-2xl font-bold">
              {{ kpi.totalLeads }}
            </div>
            <p class="text-xs text-muted-foreground">
              +{{ kpi.newLeadsThisMonth }} novos este mês
            </p>
          </template>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle class="text-sm font-medium">
            Receita Total
          </CardTitle>
          <Icon name="lucide:dollar-sign" class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <Skeleton v-if="pending" class="h-8 w-28" />
          <template v-else>
            <div class="text-2xl font-bold">
              {{ formattedRevenue }}
            </div>
            <p class="text-xs text-muted-foreground">
              {{ formattedMonthlyRevenue }} este mês
            </p>
          </template>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle class="text-sm font-medium">
            Taxa de Conversão
          </CardTitle>
          <Icon name="lucide:trending-up" class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <Skeleton v-if="pending" class="h-8 w-16" />
          <template v-else>
            <div class="text-2xl font-bold">
              {{ kpi.conversionRate }}%
            </div>
            <p class="text-xs text-muted-foreground">
              Leads ganhos / total
            </p>
          </template>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle class="text-sm font-medium">
            Ticket Médio
          </CardTitle>
          <Icon name="lucide:target" class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <Skeleton v-if="pending" class="h-8 w-28" />
          <template v-else>
            <div class="text-2xl font-bold">
              {{ formattedAverageDeal }}
            </div>
            <p class="text-xs text-muted-foreground">
              {{ formattedNegotiation }} em negociação
            </p>
          </template>
        </CardContent>
      </Card>
    </div>

    <!-- Charts row -->
    <div class="grid gap-4 lg:grid-cols-7">
      <Card class="lg:col-span-4">
        <CardHeader>
          <CardTitle>Visão da Receita</CardTitle>
          <CardDescription>Receita mensal dos últimos 6 meses (negócios ganhos)</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton v-if="pending || !AreaChart" class="h-[280px] w-full" />
          <component
            :is="AreaChart"
            v-else-if="revenueChartData.length"
            :data="revenueChartData"
            :categories="['receita']"
            index="month"
            :show-legend="false"
            class="h-[280px]"
          />
          <p v-else class="py-16 text-center text-sm text-muted-foreground">
            Sem dados de receita no período.
          </p>
        </CardContent>
      </Card>

      <Card class="lg:col-span-3">
        <CardHeader>
          <CardTitle>Funil de Vendas</CardTitle>
          <CardDescription>Distribuição de leads por estágio</CardDescription>
        </CardHeader>
        <CardContent>
          <div v-if="pending" class="space-y-4">
            <Skeleton v-for="i in 5" :key="i" class="h-8 w-full" />
          </div>
          <div v-else-if="kpi.leadsPerStage.length" class="space-y-3">
            <div v-for="stage in kpi.leadsPerStage" :key="stage.id">
              <div class="mb-1 flex items-center justify-between gap-2">
                <span class="truncate text-sm">{{ stage.name }}</span>
                <span class="shrink-0 text-sm text-muted-foreground">{{ stage.count }}</span>
              </div>
              <div class="h-2 w-full rounded-full bg-muted">
                <div
                  class="h-2 rounded-full transition-all"
                  :style="{
                    width: `${(stage.count / maxStageCount) * 100}%`,
                    backgroundColor: stage.color || 'hsl(var(--primary))',
                  }"
                />
              </div>
            </div>
          </div>
          <p v-else class="py-16 text-center text-sm text-muted-foreground">
            Nenhum estágio com leads.
          </p>
        </CardContent>
      </Card>
    </div>

    <!-- Sources + performers -->
    <div class="grid gap-4 lg:grid-cols-7">
      <Card class="lg:col-span-4">
        <CardHeader>
          <CardTitle>Desempenho por Origem</CardTitle>
          <CardDescription>Quantidade de leads por origem</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton v-if="pending || !BarChart" class="h-[280px] w-full" />
          <component
            :is="BarChart"
            v-else-if="sourcesChartData.length"
            :data="sourcesChartData"
            :categories="['leads']"
            index="name"
            :rounded-corners="4"
            :show-legend="false"
            class="h-[280px]"
          />
          <div v-else-if="kpi.topSources.length" class="space-y-3">
            <div v-for="item in kpi.topSources" :key="item.source">
              <div class="mb-1 flex justify-between">
                <span class="text-sm">{{ item.source }}</span>
                <span class="text-sm text-muted-foreground">{{ item.count }}</span>
              </div>
              <div class="h-2 w-full rounded-full bg-muted">
                <div
                  class="h-2 rounded-full bg-primary"
                  :style="{ width: `${(item.count / totalSourceCount) * 100}%` }"
                />
              </div>
            </div>
          </div>
          <p v-else class="py-16 text-center text-sm text-muted-foreground">
            Sem origens registradas.
          </p>
        </CardContent>
      </Card>

      <Card class="lg:col-span-3">
        <CardHeader>
          <CardTitle>Melhores Performers</CardTitle>
          <CardDescription>Membros com melhor desempenho em vendas</CardDescription>
        </CardHeader>
        <CardContent>
          <div v-if="pending" class="space-y-4">
            <Skeleton v-for="i in 4" :key="i" class="h-12 w-full" />
          </div>
          <div v-else-if="kpi.topPerformers.length" class="space-y-4">
            <div
              v-for="performer in kpi.topPerformers"
              :key="performer.userId"
              class="flex items-center"
            >
              <Avatar class="mr-3 h-9 w-9">
                <AvatarFallback>
                  {{ initials(getMemberName(performer.userId)) }}
                </AvatarFallback>
              </Avatar>
              <div class="min-w-0 flex-1 space-y-1">
                <div class="flex items-center justify-between gap-2">
                  <p class="truncate text-sm font-medium">
                    {{ getMemberName(performer.userId) }}
                  </p>
                  <p class="shrink-0 text-sm font-medium">
                    {{ currency(performer.revenue) }}
                  </p>
                </div>
                <p class="text-xs text-muted-foreground">
                  {{ performer.deals }} {{ performer.deals === 1 ? 'negócio' : 'negócios' }}
                </p>
              </div>
            </div>
          </div>
          <p v-else class="py-16 text-center text-sm text-muted-foreground">
            Nenhum responsável com negócios ganhos.
          </p>
        </CardContent>
      </Card>
    </div>

    <!-- Recent activity -->
    <Card>
      <CardHeader>
        <CardTitle>Atividade Recente</CardTitle>
        <CardDescription>Últimas atualizações de leads</CardDescription>
      </CardHeader>
      <CardContent>
        <div v-if="pending" class="space-y-6">
          <Skeleton v-for="i in 4" :key="i" class="h-14 w-full" />
        </div>
        <div v-else-if="kpi.recentActivity.length" class="space-y-6">
          <div
            v-for="(activity, i) in kpi.recentActivity"
            :key="activity.id"
            class="flex"
          >
            <div class="mr-4 flex flex-col items-center">
              <div class="size-8 shrink-0 flex items-center justify-center overflow-hidden rounded-full bg-muted">
                <Icon :name="activityIcon(activity.type)" class="size-4 shrink-0 text-muted-foreground" />
              </div>
              <div
                v-if="i !== kpi.recentActivity.length - 1"
                class="mt-1 h-full w-px grow bg-border"
              />
            </div>
            <div class="space-y-1 pb-2">
              <p class="text-sm font-medium leading-none">
                {{ activity.title }}
              </p>
              <p class="text-sm text-muted-foreground">
                {{ activity.description }}
              </p>
              <p class="text-xs text-muted-foreground">
                {{ formatRelativeTime(activity.occurredAt) }}
              </p>
            </div>
          </div>
        </div>
        <p v-else class="py-10 text-center text-sm text-muted-foreground">
          Nenhuma atividade recente.
        </p>
      </CardContent>
    </Card>
  </div>
</template>
