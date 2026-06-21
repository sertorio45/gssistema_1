<script setup lang="ts">
import EmptyState from '~/components/whatsapp/shared/EmptyState.vue'
import WhatsAppPageHeader from '~/components/whatsapp/shared/WhatsAppPageHeader.vue'
import { Button } from '~/components/ui/button'

definePageMeta({
  middleware: ['auth'],
  title: 'Templates',
  description: 'Templates de mensagens WhatsApp Business',
})
</script>

<template>
  <div>
    <WhatsAppPageHeader title="Templates" description="Gerencie templates aprovados pela Meta.">
      <template #actions>
        <NuxtLink to="/whatsapp/templates/new">
          <Button disabled>
            Novo template
          </Button>
        </NuxtLink>
      </template>
    </WhatsAppPageHeader>

    <EmptyState
      title="Templates em construção"
      description="Sync com Cloud API será implementado na Fase 6."
      icon="i-lucide-file-text"
    />
  </div>
</template>
