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
    <WhatsAppPageHeader title="Novo template" description="WhatsApp Cloud API · Em breve" />
    <EmptyState
      coming-soon
      title="Em breve"
      description="Criação e sync de templates Meta ficará disponível quando a Cloud API oficial for habilitada."
      icon="i-lucide-file-text"
    />
  </div>
</template>
