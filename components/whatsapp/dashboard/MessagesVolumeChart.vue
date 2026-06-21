<script setup lang="ts">
import type { Component } from 'vue'
import type { WhatsAppMessagesByDay } from '~/types/whatsapp'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Skeleton } from '~/components/ui/skeleton'

const LineChart = shallowRef<Component | null>(null)

onMounted(async () => {
  const module = await import('@/components/ui/chart-line')
  LineChart.value = module.LineChart
})

const props = defineProps<{
  data: WhatsAppMessagesByDay[]
  loading?: boolean
  periodDays: number
}>()

const chartData = computed(() =>
  props.data.map(item => ({
    label: item.label,
    enviadas: item.sent,
    recebidas: item.received,
  })),
)

const hasMessageVolume = computed(() =>
  props.data.some(item => item.sent > 0 || item.received > 0),
)
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Volume de mensagens</CardTitle>
      <CardDescription>
        Enviadas e recebidas nos últimos {{ periodDays }} dias.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <Skeleton v-if="loading" class="h-[320px] w-full" />
      <component
        :is="LineChart"
        v-else-if="hasMessageVolume && LineChart"
        :data="chartData"
        :categories="['enviadas', 'recebidas']"
        index="label"
        :colors="['hsl(var(--primary))', 'hsl(var(--muted-foreground))']"
        class="h-[320px]"
      />
      <Skeleton v-else-if="hasMessageVolume" class="h-[320px] w-full" />
      <p v-else class="py-16 text-center text-sm text-muted-foreground">
        Sem mensagens no período selecionado.
      </p>
    </CardContent>
  </Card>
</template>
