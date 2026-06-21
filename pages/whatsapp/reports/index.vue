<script setup lang="ts">
import EmptyState from '~/components/whatsapp/shared/EmptyState.vue'
import WhatsAppPageHeader from '~/components/whatsapp/shared/WhatsAppPageHeader.vue'

definePageMeta({
  middleware: ['auth'],
  title: 'Relatórios',
  description: 'Relatórios e analytics do WhatsApp',
})
</script>

<template>
  <div>
    <WhatsAppPageHeader title="Relatórios" description="Análise de volume, campanhas e agentes." />
    <EmptyState
      title="Relatórios em construção"
      description="Exportação e gráficos avançados serão implementados na Fase 10."
      icon="i-lucide-bar-chart-3"
    />
  </div>
</template>
