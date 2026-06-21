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
    <WhatsAppPageHeader
      title="Templates"
      description="Templates aprovados pela Meta (WhatsApp Cloud API)."
    >
      <template #actions>
        <Button disabled>
          Novo template
          <span class="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase">
            Em breve
          </span>
        </Button>
      </template>
    </WhatsAppPageHeader>

    <EmptyState
      coming-soon
      title="Templates em breve"
      description="A sincronização de templates depende da WhatsApp Cloud API oficial, que está em standby. Disparos via Evolution API seguem disponíveis nas conversas."
      icon="i-lucide-file-text"
    />
  </div>
</template>
