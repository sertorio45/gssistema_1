<script setup lang="ts">
import type { WhatsAppMessage } from '~/types/whatsapp'

import MessageStatusIcon from '~/components/whatsapp/conversations/MessageStatusIcon.vue'

defineProps<{
  message: WhatsAppMessage
}>()

function formatTime(value?: string | null) {
  if (!value)
    return ''
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}
</script>

<template>
  <div class="flex" :class="message.fromMe ? 'justify-end' : 'justify-start'">
    <div
      class="max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm"
      :class="message.fromMe
        ? 'rounded-br-md bg-primary text-primary-foreground'
        : 'rounded-bl-md border bg-card text-foreground'"
    >
      <p v-if="message.messageType === 'text' || !message.mediaUrl" class="whitespace-pre-wrap break-words">
        {{ message.content }}
      </p>
      <a
        v-else-if="message.mediaUrl"
        :href="message.mediaUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="underline"
      >
        {{ message.fileName || 'Ver mídia' }}
      </a>

      <div
        class="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-70"
        :class="message.fromMe ? 'text-primary-foreground/80' : 'text-muted-foreground'"
      >
        <span>{{ formatTime(message.sentAt || message.createdAt) }}</span>
        <MessageStatusIcon v-if="message.fromMe" :status="message.status" />
      </div>
    </div>
  </div>
</template>
