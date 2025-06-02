<script setup lang="ts">
import { companies, dashboardKPI, leads, meetings } from '~/data/crm-mock'

definePageMeta({
  title: 'Reports',
  description: 'Analytics and reports for your CRM data',
})

const kpi = ref(dashboardKPI)
const leadsData = ref(leads)
// const companiesData = ref(companies) // Comentado para evitar erro de variável não utilizada
const meetingsData = ref(meetings)

// Calculate additional metrics
const conversionMetrics = computed(() => {
  const totalLeads = leadsData.value.length
  const wonLeads = leadsData.value.filter(l => l.status === 'won').length
  const lostLeads = leadsData.value.filter(l => l.status === 'lost').length
  const activeLeads = totalLeads - wonLeads - lostLeads
  
  return {
    totalLeads,
    wonLeads,
    lostLeads,
    activeLeads,
    conversionRate: totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : '0',
    lossRate: totalLeads > 0 ? ((lostLeads / totalLeads) * 100).toFixed(1) : '0',
  }
})

const sourceMetrics = computed(() => {
  const sourceCount: Record<string, number> = {}
  const sourceValue: Record<string, number> = {}
  
  leadsData.value.forEach((lead) => {
    sourceCount[lead.source] = (sourceCount[lead.source] || 0) + 1
    sourceValue[lead.source] = (sourceValue[lead.source] || 0) + lead.value
  })
  
  return Object.keys(sourceCount).map(source => ({
    source,
    count: sourceCount[source],
    value: sourceValue[source],
    avgValue: sourceValue[source] / sourceCount[source],
  })).sort((a, b) => b.count - a.count)
})

const monthlyMetrics = computed(() => {
  const monthlyData: Record<string, { leads: number, revenue: number, meetings: number }> = {}
  
  // Process leads
  leadsData.value.forEach((lead) => {
    const month = new Date(lead.createdAt).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
    if (!monthlyData[month]) {
      monthlyData[month] = { leads: 0, revenue: 0, meetings: 0 }
    }
    monthlyData[month].leads++
    if (lead.status === 'won') {
      monthlyData[month].revenue += lead.value
    }
  })
  
  // Process meetings
  meetingsData.value.forEach((meeting) => {
    const month = new Date(meeting.startTime).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
    if (!monthlyData[month]) {
      monthlyData[month] = { leads: 0, revenue: 0, meetings: 0 }
    }
    monthlyData[month].meetings++
  })
  
  return Object.keys(monthlyData).map(month => ({
    month,
    ...monthlyData[month],
  })).sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
})

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
  }).format(value)
}
</script>

<template>
  <div class="w-full flex flex-col items-stretch gap-6">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">Reports & Analytics</h1>
        <p class="text-muted-foreground">Comprehensive analytics and insights for your CRM data</p>
      </div>
      <div class="flex gap-2">
        <Button variant="outline">
          <Icon name="lucide:calendar" class="mr-2 h-4 w-4" />
          Date Range
        </Button>
        <Button variant="outline">
          <Icon name="lucide:download" class="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </div>
    </div>

    <!-- Overview KPIs -->
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Total Revenue</CardTitle>
          <Icon name="lucide:dollar-sign" class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{{ formatCurrency(kpi.totalRevenue) }}</div>
          <p class="text-xs text-muted-foreground">
            {{ formatCurrency(kpi.revenueThisMonth) }} this month
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Conversion Rate</CardTitle>
          <Icon name="lucide:trending-up" class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{{ conversionMetrics.conversionRate }}%</div>
          <p class="text-xs text-muted-foreground">
            {{ conversionMetrics.wonLeads }} of {{ conversionMetrics.totalLeads }} leads
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Average Deal Size</CardTitle>
          <Icon name="lucide:target" class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{{ formatCurrency(kpi.averageDealSize) }}</div>
          <p class="text-xs text-muted-foreground">
            Per closed deal
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Active Pipeline</CardTitle>
          <Icon name="lucide:activity" class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{{ conversionMetrics.activeLeads }}</div>
          <p class="text-xs text-muted-foreground">
            Leads in progress
          </p>
        </CardContent>
      </Card>
    </div>

    <!-- Charts Row -->
    <div class="grid gap-4 md:grid-cols-2">
      <!-- Lead Sources -->
      <Card>
        <CardHeader>
          <CardTitle>Lead Sources Performance</CardTitle>
          <CardDescription>
            Performance metrics by lead source
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div class="space-y-4">
            <div v-for="source in sourceMetrics" :key="source.source" class="flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <div class="w-3 h-3 rounded-full bg-primary"></div>
                <div>
                  <p class="text-sm font-medium capitalize">{{ source.source }}</p>
                  <p class="text-xs text-muted-foreground">{{ source.count }} leads</p>
                </div>
              </div>
              <div class="text-right">
                <p class="text-sm font-medium">{{ formatCurrency(source.value) }}</p>
                <p class="text-xs text-muted-foreground">{{ formatCurrency(source.avgValue) }} avg</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Conversion Funnel -->
      <Card>
        <CardHeader>
          <CardTitle>Sales Funnel</CardTitle>
          <CardDescription>
            Lead progression through sales stages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div class="space-y-4">
            <div v-for="(count, stage) in kpi.leadsPerStage" :key="stage" class="flex items-center">
              <div class="w-2 h-2 rounded-full bg-primary mr-3"></div>
              <div class="flex-1">
                <div class="flex justify-between items-center">
                  <span class="text-sm font-medium capitalize">{{ stage.replace('-', ' ') }}</span>
                  <span class="text-sm text-muted-foreground">{{ count }}</span>
                </div>
                <div class="w-full bg-secondary rounded-full h-2 mt-1">
                  <div
                    class="bg-primary h-2 rounded-full"
                    :style="{ width: `${(count / kpi.totalLeads) * 100}%` }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Monthly Trends -->
    <Card>
      <CardHeader>
        <CardTitle>Monthly Trends</CardTitle>
        <CardDescription>
          Leads, revenue, and meetings over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div v-for="month in monthlyMetrics" :key="month.month" class="border rounded-lg p-4">
              <h4 class="font-medium mb-2">{{ month.month }}</h4>
              <div class="space-y-2">
                <div class="flex justify-between">
                  <span class="text-sm text-muted-foreground">Leads:</span>
                  <span class="text-sm font-medium">{{ month.leads }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-sm text-muted-foreground">Revenue:</span>
                  <span class="text-sm font-medium">{{ formatCurrency(month.revenue) }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-sm text-muted-foreground">Meetings:</span>
                  <span class="text-sm font-medium">{{ month.meetings }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Team Performance -->
    <Card>
      <CardHeader>
        <CardTitle>Team Performance</CardTitle>
        <CardDescription>
          Individual performance metrics
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div class="space-y-4">
          <div v-for="performer in kpi.topPerformers" :key="performer.name" class="flex items-center justify-between p-4 border rounded-lg">
            <div class="flex items-center space-x-3">
              <Avatar class="h-10 w-10">
                <AvatarFallback>{{ performer.name.split(' ').map(n => n[0]).join('') }}</AvatarFallback>
              </Avatar>
              <div>
                <p class="text-sm font-medium">{{ performer.name }}</p>
                <p class="text-xs text-muted-foreground">{{ performer.deals }} deals closed</p>
              </div>
            </div>
            <div class="text-right">
              <p class="text-sm font-medium">{{ formatCurrency(performer.revenue) }}</p>
              <p class="text-xs text-muted-foreground">
                {{ formatCurrency(performer.revenue / performer.deals) }} avg deal
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template> 
