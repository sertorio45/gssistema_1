<script setup lang="ts">
import { Badge } from '~/components/ui/badge'
import { WHATSAPP_FLOW_STATUS_LABELS } from '~/constants/whatsapp'

defineProps<{
  status: string
}>()
</script>

<template>
  <Badge :variant="status === 'active' ? 'default' : 'secondary'">
    {{ WHATSAPP_FLOW_STATUS_LABELS[status] || status }}
  </Badge>
</template>
