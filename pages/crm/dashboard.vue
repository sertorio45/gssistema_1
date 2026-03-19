<script setup lang="ts">
import { dashboardKPI } from '~/data/crm-mock'

definePageMeta({
  title: 'Painel CRM',
  description: 'Visão geral do desempenho de vendas e métricas principais',
})

const kpi = ref(dashboardKPI)

// Computed values for better formatting
const formattedRevenue = computed(() =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
  }).format(kpi.value.totalRevenue),
)

const formattedMonthlyRevenue = computed(() =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
  }).format(kpi.value.revenueThisMonth),
)

const formattedAverageDeal = computed(() =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
  }).format(kpi.value.averageDealSize),
)

// Chart data
const revenueChartData = computed(() =>
  kpi.value.revenueByMonth.map(item => ({
    month: item.month,
    revenue: item.revenue,
  })),
)

const leadSourcesChartData = computed(() =>
  kpi.value.topSources.map(source => ({
    source: source.source,
    count: source.count,
  })),
)

const pipelineChartData = computed(() =>
  Object.entries(kpi.value.leadsPerStage).map(([stage, count]) => ({
    stage: stage.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    count: count as number,
    fill: getStageColor(stage),
  })),
)

function getStageColor(stage: string) {
  const colors = {
    new: 'hsl(var(--chart-1))',
    contacted: 'hsl(var(--chart-2))',
    qualified: 'hsl(var(--chart-3))',
    proposal: 'hsl(var(--chart-4))',
    negotiation: 'hsl(var(--chart-5))',
    won: 'hsl(142, 76%, 36%)',
    lost: 'hsl(var(--muted))',
  }
  return colors[stage as keyof typeof colors] || 'hsl(var(--chart-1))'
}

// Mock recent activity data
const recentActivity = [
  {
    title: 'Novo lead criado',
    description: 'João Silva da TechCorp Solutions',
    time: 'Há 2 horas',
    icon: 'lucide:user-plus',
  },
  {
    title: 'Reunião agendada',
    description: 'Demo com Digital Marketing Pro',
    time: 'Há 4 horas',
    icon: 'lucide:calendar',
  },
  {
    title: 'Negócio ganho',
    description: 'Retail Solutions - R$ 85.000',
    time: 'Há 1 dia',
    icon: 'lucide:check-circle',
  },
  {
    title: 'Proposta enviada',
    description: 'Solução personalizada E-commerce Plus',
    time: 'Há 2 dias',
    icon: 'lucide:mail',
  },
]
</script>

<template>
  <div class="w-full flex flex-col items-stretch gap-6">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">
          Painel CRM
        </h1>
        <p class="text-muted-foreground">
          Visão geral do desempenho de vendas e métricas principais
        </p>
      </div>
      <div class="flex gap-2">
        <Button variant="outline">
          <Icon name="lucide:download" class="mr-2 h-4 w-4" />
          Exportar
        </Button>
        <Button>
          <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
          Novo Lead
        </Button>
      </div>
    </div>

    <!-- KPI Cards -->
    <div class="grid gap-4 lg:grid-cols-4 md:grid-cols-2">
      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle class="text-sm font-medium">
            Total de Leads
          </CardTitle>
          <Icon name="lucide:users" class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {{ kpi.totalLeads }}
          </div>
          <p class="text-xs text-muted-foreground">
            +{{ kpi.newLeadsThisMonth }} novos este mês
          </p>
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
          <div class="text-2xl font-bold">
            {{ formattedRevenue }}
          </div>
          <p class="text-xs text-muted-foreground">
            {{ formattedMonthlyRevenue }} este mês
          </p>
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
          <div class="text-2xl font-bold">
            {{ kpi.conversionRate }}%
          </div>
          <p class="text-xs text-muted-foreground">
            +2,1% em relação ao mês passado
          </p>
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
          <div class="text-2xl font-bold">
            {{ formattedAverageDeal }}
          </div>
          <p class="text-xs text-muted-foreground">
            +5,2% em relação ao mês passado
          </p>
        </CardContent>
      </Card>
    </div>

    <!-- Charts Row -->
    <div class="grid gap-4 lg:grid-cols-7 md:grid-cols-2">
      <!-- Revenue Chart -->
      <Card class="col-span-4">
        <CardHeader>
          <CardTitle>Visão da Receita</CardTitle>
          <CardDescription>Receita mensal dos últimos 6 meses</CardDescription>
        </CardHeader>
        <CardContent class="pl-2">
          <!-- Substituído por tabela simples -->
          <div class="h-[300px] overflow-auto">
            <table class="w-full">
              <thead>
                <tr>
                  <th class="p-2 text-left">
                    Mês
                  </th>
                  <th class="p-2 text-right">
                    Receita
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in revenueChartData" :key="item.month" class="border-b">
                  <td class="p-2">
                    {{ item.month }}
                  </td>
                  <td class="p-2 text-right">
                    {{
                      new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                        minimumFractionDigits: 0,
                      }).format(item.revenue)
                    }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <!-- Pipeline Overview -->
      <Card class="col-span-3">
        <CardHeader>
          <CardTitle>Pipeline de Vendas</CardTitle>
          <CardDescription>Distribuição de leads por estágio</CardDescription>
        </CardHeader>
        <CardContent>
          <!-- Substituído por tabela simples -->
          <div class="h-[300px] overflow-auto">
            <div v-for="item in pipelineChartData" :key="item.stage" class="mb-3">
              <div class="mb-1 flex justify-between">
                <span class="text-sm">{{ item.stage }}</span>
                <span class="text-sm">{{ item.count }} leads</span>
              </div>
              <div class="h-2 w-full rounded-full bg-muted">
                <div
                  class="h-2 rounded-full"
                  :style="{ width: `${(item.count / kpi.totalLeads) * 100}%`, backgroundColor: item.fill }"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Bottom Row -->
    <div class="grid gap-4 lg:grid-cols-7 md:grid-cols-2">
      <!-- Top Sources Chart -->
      <Card class="col-span-4">
        <CardHeader>
          <CardTitle>Desempenho por Origem</CardTitle>
          <CardDescription>Quantidade de leads por origem</CardDescription>
        </CardHeader>
        <CardContent>
          <!-- Substituído por tabela simples -->
          <div class="h-[300px] overflow-auto">
            <div v-for="item in leadSourcesChartData" :key="item.source" class="mb-3">
              <div class="mb-1 flex justify-between">
                <span class="text-sm capitalize">{{ item.source }}</span>
                <span class="text-sm">{{ item.count }} leads</span>
              </div>
              <div class="h-2 w-full rounded-full bg-muted">
                <div
                  class="h-2 rounded-full bg-primary"
                  :style="{ width: `${(item.count / kpi.topSources.reduce((sum, s) => sum + s.count, 0)) * 100}%` }"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Top Performers -->
      <Card class="col-span-3">
        <CardHeader>
          <CardTitle>Melhores Performers</CardTitle>
          <CardDescription>Membros da equipe com melhor desempenho em vendas</CardDescription>
        </CardHeader>
        <CardContent>
          <div class="space-y-4">
            <div v-for="performer in kpi.topPerformers" :key="performer.name" class="flex items-center">
              <Avatar class="mr-3 h-9 w-9">
                <AvatarFallback>
                  {{
                    performer.name
                      .split(' ')
                      .map(n => n[0])
                      .join('')
                  }}
                </AvatarFallback>
              </Avatar>
              <div class="flex-1 space-y-1">
                <div class="flex items-center justify-between">
                  <p class="text-sm font-medium">
                    {{ performer.name }}
                  </p>
                  <div class="text-right">
                    <p class="text-sm font-medium">
                      {{
                        new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                          minimumFractionDigits: 0,
                        }).format(performer.revenue)
                      }}
                    </p>
                  </div>
                </div>
                <div class="flex items-center text-muted-foreground">
                  <span class="text-xs">{{ performer.deals }} negócios</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Recent Activity -->
    <Card>
      <CardHeader>
        <CardTitle>Atividade Recente</CardTitle>
        <CardDescription>Últimas ações e atualizações</CardDescription>
      </CardHeader>
      <CardContent>
        <div class="space-y-8">
          <div v-for="(activity, i) in recentActivity" :key="i" class="flex">
            <div class="mr-4 flex flex-col items-center">
              <div class="h-8 w-8 flex items-center justify-center rounded-full bg-muted">
                <Icon :name="activity.icon" class="h-4 w-4" />
              </div>
              <div v-if="i !== recentActivity.length - 1" class="h-full w-px bg-muted" />
            </div>
            <div class="space-y-1">
              <p class="text-sm font-medium leading-none">
                {{ activity.title }}
              </p>
              <p class="text-sm text-muted-foreground">
                {{ activity.description }}
              </p>
              <p class="text-xs text-muted-foreground">
                {{ activity.time }}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
