<script setup lang="ts">
import EmptyState from '~/components/whatsapp/shared/EmptyState.vue'
import WhatsAppPageHeader from '~/components/whatsapp/shared/WhatsAppPageHeader.vue'
import { Button } from '~/components/ui/button'

definePageMeta({
  middleware: ['auth'],
  title: 'Campanhas',
  description: 'Disparos em massa via WhatsApp',
})
</script>

<template>
  <div>
    <WhatsAppPageHeader title="Campanhas" description="Crie e acompanhe campanhas de mensagens.">
      <template #actions>
        <NuxtLink to="/whatsapp/campaigns/new">
          <Button disabled>
            Nova campanha
          </Button>
        </NuxtLink>
      </template>
    </WhatsAppPageHeader>

    <EmptyState
      title="Campanhas em construção"
      description="O wizard de campanhas será implementado na Fase 7."
      icon="i-lucide-megaphone"
    />
  </div>
</template>
