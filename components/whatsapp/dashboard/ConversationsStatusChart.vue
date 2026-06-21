<script setup lang="ts">
import type { Component } from 'vue'
import type { WhatsAppConversationsByStatus } from '~/types/whatsapp'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Skeleton } from '~/components/ui/skeleton'

const DonutChart = shallowRef<Component | null>(null)

onMounted(async () => {
  const module = await import('@/components/ui/chart-donut')
  DonutChart.value = module.DonutChart
})

const props = defineProps<{
  data: WhatsAppConversationsByStatus[]
  loading?: boolean
}>()

const chartData = computed(() =>
  props.data.map(item => ({
    status: item.label,
    total: item.count,
  })),
)
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Conversas por status</CardTitle>
      <CardDescription>
        Distribuição atual do inbox.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <Skeleton v-if="loading" class="mx-auto h-[280px] w-[280px] rounded-full" />
      <component
        :is="DonutChart"
        v-else-if="chartData.length && DonutChart"
        :data="chartData"
        index="status"
        category="total"
        :type="'donut'"
        class="h-[280px]"
      />
      <Skeleton v-else-if="chartData.length" class="mx-auto h-[280px] w-[280px] rounded-full" />
      <p v-else class="py-16 text-center text-sm text-muted-foreground">
        Nenhuma conversa registrada.
      </p>
    </CardContent>
  </Card>
</template>
