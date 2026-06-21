<script setup lang="ts">
import type { WhatsAppCampaignStatus } from '~/types/whatsapp'

import { Badge } from '~/components/ui/badge'

const props = defineProps<{
  status: WhatsAppCampaignStatus | string
}>()

const config = computed(() => {
  const map: Record<string, { label: string, variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    draft: { label: 'Rascunho', variant: 'outline' },
    scheduled: { label: 'Agendada', variant: 'secondary' },
    running: { label: 'Enviando', variant: 'default' },
    paused: { label: 'Pausada', variant: 'secondary' },
    completed: { label: 'Concluída', variant: 'outline' },
    failed: { label: 'Falhou', variant: 'destructive' },
  }
  return map[props.status] ?? { label: props.status, variant: 'outline' as const }
})
</script>

<template>
  <Badge :variant="config.variant">
    {{ config.label }}
  </Badge>
</template>
