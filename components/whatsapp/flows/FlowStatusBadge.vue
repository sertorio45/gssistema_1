<script setup lang="ts">
import { Badge } from '~/components/ui/badge'
import { WHATSAPP_FLOW_STATUS_LABELS } from '~/constants/whatsapp'

const props = defineProps<{
  status: string
}>()

const variantClass = computed(() => {
  switch (props.status) {
    case 'active':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
    case 'paused':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
    case 'archived':
      return 'border-border bg-muted/50 text-muted-foreground'
    default:
      return 'border-border bg-background text-foreground'
  }
})
</script>

<template>
  <Badge variant="outline" :class="variantClass">
    {{ WHATSAPP_FLOW_STATUS_LABELS[status] || status }}
  </Badge>
</template>
