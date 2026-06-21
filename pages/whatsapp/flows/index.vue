<script setup lang="ts">
import EmptyState from '~/components/whatsapp/shared/EmptyState.vue'
import WhatsAppPageHeader from '~/components/whatsapp/shared/WhatsAppPageHeader.vue'
import { Button } from '~/components/ui/button'

definePageMeta({
  middleware: ['auth'],
  title: 'Flows',
  description: 'Automações visuais de atendimento',
})
</script>

<template>
  <div>
    <WhatsAppPageHeader title="Flows" description="Crie automações estilo Manychat e n8n.">
      <template #actions>
        <NuxtLink to="/whatsapp/flows/new">
          <Button disabled>
            Novo flow
          </Button>
        </NuxtLink>
      </template>
    </WhatsAppPageHeader>

    <EmptyState
      title="Flow Builder em construção"
      description="O editor visual com Vue Flow será implementado na Fase 8."
      icon="i-lucide-workflow"
    />
  </div>
</template>
