<script setup lang="ts">
import type { WhatsAppFlow } from '~/types/whatsapp'

import { Card, CardContent } from '~/components/ui/card'

const props = defineProps<{
  flows: WhatsAppFlow[]
}>()

const stats = computed(() => {
  const list = props.flows
  return [
    {
      label: 'Total de flows',
      value: list.length,
      icon: 'i-lucide-workflow',
    },
    {
      label: 'Ativos',
      value: list.filter(flow => flow.status === 'active').length,
      icon: 'i-lucide-play-circle',
    },
    {
      label: 'Rascunhos',
      value: list.filter(flow => flow.status === 'draft').length,
      icon: 'i-lucide-file-pen',
    },
    {
      label: 'Execuções',
      value: list.reduce((sum, flow) => sum + (flow.executionsCount ?? 0), 0),
      icon: 'i-lucide-activity',
    },
  ]
})
</script>

<template>
  <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
    <Card
      v-for="item in stats"
      :key="item.label"
      class="border-border/60 bg-muted/15 shadow-none"
    >
      <CardContent class="flex items-center gap-3 p-4">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-background">
          <span :class="item.icon" class="h-4 w-4 text-muted-foreground" />
        </div>
        <div class="min-w-0">
          <p class="text-xs text-muted-foreground">
            {{ item.label }}
          </p>
          <p class="text-xl font-semibold tracking-tight">
            {{ item.value }}
          </p>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
