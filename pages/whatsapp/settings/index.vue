<script setup lang="ts">
import EmptyState from '~/components/whatsapp/shared/EmptyState.vue'
import WhatsAppPageHeader from '~/components/whatsapp/shared/WhatsAppPageHeader.vue'

definePageMeta({
  middleware: ['auth'],
  title: 'Configurações WhatsApp',
  description: 'Configurações gerais do módulo',
})
</script>

<template>
  <div>
    <WhatsAppPageHeader title="Configurações" description="Horários, notificações e respostas automáticas." />
    <EmptyState
      title="Configurações em construção"
      description="Painel de configurações será implementado na Fase 11."
      icon="i-lucide-settings"
    />
  </div>
</template>
