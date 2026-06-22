<script setup lang="ts">
import type { WhatsAppConversation, WhatsAppConversationLead } from '~/types/whatsapp'

import { formatLeadCurrency } from '~/composables/crm/useCrmLeadValue'
import WhatsAppStatusBadge from '~/components/whatsapp/shared/WhatsAppStatusBadge.vue'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'

defineProps<{
  conversation: WhatsAppConversation | null
  lead: WhatsAppConversationLead | null
}>()
</script>

<template>
  <div v-if="conversation" class="hidden h-full min-h-0 flex-col border-l bg-background xl:flex xl:w-64">
    <div class="border-b px-4 py-3">
      <h3 class="text-sm font-medium">
        Detalhes
      </h3>
    </div>
    <div class="flex-1 overflow-y-auto p-4">
      <Card>
        <CardHeader class="pb-2">
          <CardTitle class="text-xs font-medium text-muted-foreground">
            Contato
          </CardTitle>
        </CardHeader>
        <CardContent class="space-y-1.5 text-sm">
          <p class="font-medium">
            {{ conversation.contactName }}
          </p>
          <p class="text-xs text-muted-foreground">
            {{ conversation.contactPhone }}
          </p>
          <WhatsAppStatusBadge :status="conversation.status" />
        </CardContent>
      </Card>

      <Card v-if="lead" class="mt-3">
        <CardHeader class="pb-2">
          <CardTitle class="text-xs font-medium text-muted-foreground">
            Lead
          </CardTitle>
        </CardHeader>
        <CardContent class="space-y-1 text-xs text-muted-foreground">
          <p class="text-sm font-medium text-foreground">
            {{ lead.name }}
          </p>
          <p>{{ lead.funnelName }} · {{ lead.stageName }}</p>
          <p v-if="lead.serviceName">
            {{ lead.serviceName }}
          </p>
          <p v-if="lead.value">
            {{ formatLeadCurrency(lead.value) }}
          </p>
          <NuxtLink to="/crm/funnel" class="inline-block pt-1 text-primary hover:underline">
            Funil →
          </NuxtLink>
        </CardContent>
      </Card>

      <div v-if="conversation.crmContactId || conversation.activeAgentName" class="mt-3 space-y-1 px-1 text-xs text-muted-foreground">
        <p v-if="conversation.crmContactId">
          CRM vinculado
        </p>
        <p v-if="conversation.activeAgentName">
          IA: {{ conversation.activeAgentName }}
        </p>
      </div>
    </div>
  </div>
</template>
