<script setup lang="ts">
import type { WhatsAppConversation } from '~/types/whatsapp'

import ChatHeader from '~/components/whatsapp/conversations/ChatHeader.vue'
import MessageComposer from '~/components/whatsapp/conversations/MessageComposer.vue'
import MessageList from '~/components/whatsapp/conversations/MessageList.vue'

const props = defineProps<{
  conversation: WhatsAppConversation | null
  messages: import('~/types/whatsapp').WhatsAppMessage[]
  loading?: boolean
  sending?: boolean
}>()

const emit = defineEmits<{
  send: [content: string]
  statusChange: [status: WhatsAppConversation['status']]
}>()
</script>

<template>
  <div class="flex h-full min-h-0 flex-col bg-muted/10">
    <template v-if="conversation">
      <ChatHeader
        :conversation="conversation"
        @status-change="emit('statusChange', $event)"
      />
      <MessageList :messages="messages" :loading="loading" />
      <MessageComposer
        :disabled="false"
        :sending="sending"
        @send="emit('send', $event)"
      />
    </template>
    <div v-else class="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
      <span class="i-lucide-messages-square h-12 w-12 opacity-40" />
      <p class="text-sm">
        Selecione uma conversa para começar
      </p>
    </div>
  </div>
</template>
