<script setup lang="ts">
import EmptyState from '~/components/whatsapp/shared/EmptyState.vue'
import WhatsAppPageHeader from '~/components/whatsapp/shared/WhatsAppPageHeader.vue'

definePageMeta({
  middleware: ['auth'],
  title: 'Novo template',
})
</script>

<template>
  <div>
    <WhatsAppPageHeader title="Novo template" />
    <EmptyState icon="i-lucide-file-text" />
  </div>
</template>
