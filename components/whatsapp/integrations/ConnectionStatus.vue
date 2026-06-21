<script setup lang="ts">
import type { WhatsAppInstanceStatus } from '~/types/whatsapp'

import WhatsAppStatusBadge from '~/components/whatsapp/shared/WhatsAppStatusBadge.vue'

defineProps<{
  status: WhatsAppInstanceStatus | string
  phoneNumber?: string | null
}>()
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <WhatsAppStatusBadge :status="status" />
    <span v-if="phoneNumber" class="text-sm text-muted-foreground">
      {{ phoneNumber }}
    </span>
  </div>
</template>
