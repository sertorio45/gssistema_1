<script setup lang="ts">
import EmptyState from '~/components/whatsapp/shared/EmptyState.vue'
import WhatsAppPageHeader from '~/components/whatsapp/shared/WhatsAppPageHeader.vue'

definePageMeta({
  middleware: ['auth'],
  title: 'Campanha',
})
</script>

<template>
  <div>
    <WhatsAppPageHeader title="Detalhes da campanha" />
    <EmptyState icon="i-lucide-megaphone" />
  </div>
</template>
