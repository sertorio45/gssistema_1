<script setup lang="ts">
import ConversationInbox from '~/components/whatsapp/conversations/ConversationInbox.vue'
import WhatsAppPageHeader from '~/components/whatsapp/shared/WhatsAppPageHeader.vue'
import { Button } from '~/components/ui/button'
import { Skeleton } from '~/components/ui/skeleton'

definePageMeta({
  middleware: ['auth'],
  title: 'Conversas',
  description: 'Inbox de atendimento WhatsApp',
})
</script>

<template>
  <div class="flex h-full flex-col">
    <WhatsAppPageHeader
      title="Conversas"
      description="Caixas de entrada separadas por número WhatsApp conectado."
    >
      <template #actions>
        <NuxtLink to="/whatsapp/integrations">
          <Button variant="outline" size="sm">
            <span class="i-lucide-plug mr-2 h-4 w-4" />
            Nova instância
          </Button>
        </NuxtLink>
      </template>
    </WhatsAppPageHeader>

    <ClientOnly>
      <ConversationInbox />
      <template #fallback>
        <div class="flex h-[calc(100vh-8rem)] min-h-[560px] overflow-hidden rounded-xl border bg-background shadow-sm">
          <div class="hidden w-56 shrink-0 border-r p-3 lg:block">
            <Skeleton class="mb-2 h-4 w-24" />
            <div class="space-y-2">
              <Skeleton v-for="i in 3" :key="i" class="h-14 w-full rounded-lg" />
            </div>
          </div>
          <div class="w-full shrink-0 border-r p-4 md:w-80 lg:w-96">
            <Skeleton class="mb-3 h-9 w-full" />
            <Skeleton class="mb-3 h-8 w-full" />
            <div class="space-y-3">
              <Skeleton v-for="i in 6" :key="i" class="h-16 w-full" />
            </div>
          </div>
          <div class="hidden flex-1 items-center justify-center md:flex">
            <Skeleton class="h-8 w-48" />
          </div>
        </div>
      </template>
    </ClientOnly>
  </div>
</template>
