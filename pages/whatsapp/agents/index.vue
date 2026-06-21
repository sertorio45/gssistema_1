<script setup lang="ts">
import EmptyState from '~/components/whatsapp/shared/EmptyState.vue'
import WhatsAppPageHeader from '~/components/whatsapp/shared/WhatsAppPageHeader.vue'
import { Button } from '~/components/ui/button'

definePageMeta({
  middleware: ['auth'],
  title: 'Agentes IA',
  description: 'Agentes de inteligência artificial para atendimento',
})
</script>

<template>
  <div>
    <WhatsAppPageHeader title="Agentes IA" description="Configure agentes com tools MCP.">
      <template #actions>
        <NuxtLink to="/whatsapp/agents/new">
          <Button disabled>
            Novo agente
          </Button>
        </NuxtLink>
      </template>
    </WhatsAppPageHeader>

    <EmptyState
      title="Agentes em construção"
      description="Agentes IA com integração MCP serão implementados na Fase 9."
      icon="i-lucide-bot"
    />
  </div>
</template>
