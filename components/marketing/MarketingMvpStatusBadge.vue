<script setup lang="ts">
import type { MarketingMvpStatus } from '~/types/marketing-mvp'
import { MARKETING_MVP_STATUS_LABELS } from '~/types/marketing-mvp'
import { cn } from '@/lib/utils'

const props = defineProps<{
  status: MarketingMvpStatus
  class?: string
}>()

const toneClass = computed(() => {
  switch (props.status) {
    case 'rascunho':
      return 'bg-muted text-muted-foreground'
    case 'producao':
      return 'bg-sky-500/10 text-sky-700 dark:text-sky-300'
    case 'aprovacao':
      return 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
    case 'agendado':
      return 'bg-violet-500/10 text-violet-700 dark:text-violet-300'
    case 'publicado':
      return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
    case 'erro':
      return 'bg-destructive/10 text-destructive'
    default:
      return 'bg-muted text-muted-foreground'
  }
})
</script>

<template>
  <span
    :class="cn(
      'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
      toneClass,
      props.class,
    )"
  >
    {{ MARKETING_MVP_STATUS_LABELS[status] }}
  </span>
</template>
