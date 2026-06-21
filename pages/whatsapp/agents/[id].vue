<script setup lang="ts">
import EmptyState from '~/components/whatsapp/shared/EmptyState.vue'
import WhatsAppPageHeader from '~/components/whatsapp/shared/WhatsAppPageHeader.vue'

definePageMeta({
  middleware: ['auth'],
  title: 'Agente IA',
})
</script>

<template>
  <div>
    <WhatsAppPageHeader title="Configurar agente" />
    <EmptyState icon="i-lucide-bot" />
  </div>
</template>
