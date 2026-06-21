<script setup lang="ts">
import EmptyState from '~/components/whatsapp/shared/EmptyState.vue'
import WhatsAppPageHeader from '~/components/whatsapp/shared/WhatsAppPageHeader.vue'

definePageMeta({
  middleware: ['auth'],
  title: 'Novo agente IA',
})
</script>

<template>
  <div>
    <WhatsAppPageHeader title="Novo agente IA" />
    <EmptyState icon="i-lucide-bot" />
  </div>
</template>
