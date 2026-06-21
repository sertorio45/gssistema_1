<script setup lang="ts">
import EmptyState from '~/components/whatsapp/shared/EmptyState.vue'
import WhatsAppPageHeader from '~/components/whatsapp/shared/WhatsAppPageHeader.vue'

definePageMeta({
  middleware: ['auth'],
  title: 'Novo flow',
})
</script>

<template>
  <div>
    <WhatsAppPageHeader title="Novo flow" />
    <EmptyState icon="i-lucide-workflow" />
  </div>
</template>
