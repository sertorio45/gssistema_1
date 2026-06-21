<script setup lang="ts">
import EmptyState from '~/components/whatsapp/shared/EmptyState.vue'
import WhatsAppPageHeader from '~/components/whatsapp/shared/WhatsAppPageHeader.vue'

definePageMeta({
  middleware: ['auth'],
  title: 'Flow Builder',
})
</script>

<template>
  <div>
    <WhatsAppPageHeader title="Flow Builder" description="Editor visual de automações." />
    <EmptyState icon="i-lucide-workflow" />
  </div>
</template>
