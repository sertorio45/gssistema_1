<script setup lang="ts">
import type { WhatsAppConversation } from '~/types/whatsapp'

import WhatsAppStatusBadge from '~/components/whatsapp/shared/WhatsAppStatusBadge.vue'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'

defineProps<{
  conversation: WhatsAppConversation | null
}>()
</script>

<template>
  <div v-if="conversation" class="hidden h-full min-h-0 flex-col border-l bg-background xl:flex xl:w-72">
    <div class="border-b p-4">
      <h3 class="font-medium">
        Detalhes
      </h3>
    </div>
    <div class="flex-1 overflow-y-auto p-4">
      <Card>
        <CardHeader class="pb-2">
          <CardTitle class="text-sm">
            Contato
          </CardTitle>
        </CardHeader>
        <CardContent class="space-y-2 text-sm">
          <p class="font-medium">
            {{ conversation.contactName }}
          </p>
          <p class="text-muted-foreground">
            {{ conversation.contactPhone }}
          </p>
          <WhatsAppStatusBadge :status="conversation.status" />
        </CardContent>
      </Card>

      <Card class="mt-4">
        <CardHeader class="pb-2">
          <CardTitle class="text-sm">
            Informações
          </CardTitle>
        </CardHeader>
        <CardContent class="space-y-2 text-xs text-muted-foreground">
          <p v-if="conversation.leadId">
            Lead vinculado
          </p>
          <p v-if="conversation.crmContactId">
            Contato CRM vinculado
          </p>
          <p>Canal: {{ conversation.channel }}</p>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
