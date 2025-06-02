<script setup lang="ts">
import { dashboardKPI } from '~/data/crm-mock'

definePageMeta({
  title: 'CRM Dashboard',
  description: 'Overview of your sales performance and key metrics',
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
    title: 'New lead created',
    description: 'João Silva from TechCorp Solutions',
    time: '2 hours ago',
    icon: 'lucide:user-plus',
  },
  {
    title: 'Meeting scheduled',
    description: 'Demo with Digital Marketing Pro',
    time: '4 hours ago',
    icon: 'lucide:calendar',
  },
  {
    title: 'Deal won',
    description: 'Retail Solutions - R$ 85.000',
    time: '1 day ago',
    icon: 'lucide:check-circle',
  },
  {
    title: 'Proposal sent',
    description: 'E-commerce Plus custom solution',
    time: '2 days ago',
    icon: 'lucide:mail',
  },
]
</script>

<template>
  <div class="w-full flex flex-col items-stretch gap-6">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">CRM Dashboard</h1>
        <p class="text-muted-foreground">Overview of your sales performance and key metrics</p>
      </div>
      <div class="flex gap-2">
        <Button variant="outline">
          <Icon name="lucide:download" class="mr-2 h-4 w-4" />
          Export
        </Button>
        <Button>
          <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
          New Lead
        </Button>
      </div>
    </div>

    <!-- KPI Cards -->
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">
            Total Leads
          </CardTitle>
          <Icon name="lucide:users" class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{{ kpi.totalLeads }}</div>
          <p class="text-xs text-muted-foreground">
            +{{ kpi.newLeadsThisMonth }} new this month
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">
            Total Revenue
          </CardTitle>
          <Icon name="lucide:dollar-sign" class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{{ formattedRevenue }}</div>
          <p class="text-xs text-muted-foreground">
            {{ formattedMonthlyRevenue }} this month
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">
            Conversion Rate
          </CardTitle>
          <Icon name="lucide:trending-up" class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{{ kpi.conversionRate }}%</div>
          <p class="text-xs text-muted-foreground">
            +2.1% from last month
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">
            Average Deal Size
          </CardTitle>
          <Icon name="lucide:target" class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{{ formattedAverageDeal }}</div>
          <p class="text-xs text-muted-foreground">
            +5.2% from last month
          </p>
        </CardContent>
      </Card>
    </div>

    <!-- Charts Row -->
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
      <!-- Revenue Chart -->
      <Card class="col-span-4">
        <CardHeader>
          <CardTitle>Revenue Overview</CardTitle>
          <CardDescription>
            Monthly revenue for the last 6 months
          </CardDescription>
        </CardHeader>
        <CardContent class="pl-2">
          <!-- Substituído por tabela simples -->
          <div class="h-[300px] overflow-auto">
            <table class="w-full">
              <thead>
                <tr>
                  <th class="text-left p-2">Month</th>
                  <th class="text-right p-2">Revenue</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in revenueChartData" :key="item.month" class="border-b">
                  <td class="p-2">{{ item.month }}</td>
                  <td class="text-right p-2">
                    {{ new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                      minimumFractionDigits: 0,
                    }).format(item.revenue) }}
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
          <CardTitle>Sales Pipeline</CardTitle>
          <CardDescription>
            Leads distribution by stage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <!-- Substituído por tabela simples -->
          <div class="h-[300px] overflow-auto">
            <div v-for="item in pipelineChartData" :key="item.stage" class="mb-3">
              <div class="flex justify-between mb-1">
                <span class="text-sm">{{ item.stage }}</span>
                <span class="text-sm">{{ item.count }} leads</span>
              </div>
              <div class="w-full bg-muted rounded-full h-2">
                <div
                  class="h-2 rounded-full"
                  :style="{ width: `${(item.count / kpi.totalLeads) * 100}%`, backgroundColor: item.fill }"
                ></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Bottom Row -->
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
      <!-- Top Sources Chart -->
      <Card class="col-span-4">
        <CardHeader>
          <CardTitle>Lead Sources Performance</CardTitle>
          <CardDescription>
            Number of leads by source
          </CardDescription>
        </CardHeader>
        <CardContent>
          <!-- Substituído por tabela simples -->
          <div class="h-[300px] overflow-auto">
            <div v-for="item in leadSourcesChartData" :key="item.source" class="mb-3">
              <div class="flex justify-between mb-1">
                <span class="text-sm capitalize">{{ item.source }}</span>
                <span class="text-sm">{{ item.count }} leads</span>
              </div>
              <div class="w-full bg-muted rounded-full h-2">
                <div
                  class="bg-primary h-2 rounded-full"
                  :style="{ width: `${(item.count / kpi.topSources.reduce((sum, s) => sum + s.count, 0)) * 100}%` }"
                ></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Top Performers -->
      <Card class="col-span-3">
        <CardHeader>
          <CardTitle>Top Performers</CardTitle>
          <CardDescription>
            Team members with best sales performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div class="space-y-4">
            <div v-for="performer in kpi.topPerformers" :key="performer.name" class="flex items-center">
              <Avatar class="h-9 w-9 mr-3">
                <AvatarFallback>{{ performer.name.split(' ').map(n => n[0]).join('') }}</AvatarFallback>
              </Avatar>
              <div class="flex-1 space-y-1">
                <div class="flex items-center justify-between">
                  <p class="text-sm font-medium">{{ performer.name }}</p>
                  <div class="text-right">
                    <p class="text-sm font-medium">
                      {{ new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                        minimumFractionDigits: 0,
                      }).format(performer.revenue) }}
                    </p>
                  </div>
                </div>
                <div class="flex items-center text-muted-foreground">
                  <span class="text-xs">{{ performer.deals }} deals</span>
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
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest actions and updates</CardDescription>
      </CardHeader>
      <CardContent>
        <div class="space-y-8">
          <div v-for="(activity, i) in recentActivity" :key="i" class="flex">
            <div class="mr-4 flex flex-col items-center">
              <div class="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                <Icon :name="activity.icon" class="h-4 w-4" />
              </div>
              <div class="h-full w-px bg-muted" v-if="i !== recentActivity.length - 1" />
            </div>
            <div class="space-y-1">
              <p class="text-sm font-medium leading-none">{{ activity.title }}</p>
              <p class="text-sm text-muted-foreground">{{ activity.description }}</p>
              <p class="text-xs text-muted-foreground">{{ activity.time }}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template> 
