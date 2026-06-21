<script setup lang="ts">
import type { WhatsAppConversation } from '~/types/whatsapp'

import WhatsAppStatusBadge from '~/components/whatsapp/shared/WhatsAppStatusBadge.vue'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'

const props = defineProps<{
  conversation: WhatsAppConversation | null
}>()

const emit = defineEmits<{
  statusChange: [status: WhatsAppConversation['status']]
}>()

const initials = computed(() => {
  const name = props.conversation?.contactName || '?'
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
})
</script>

<template>
  <div v-if="conversation" class="flex items-center justify-between border-b px-4 py-3">
    <div class="flex min-w-0 items-center gap-3">
      <Avatar class="h-10 w-10">
        <AvatarImage :src="conversation.profilePicture || undefined" />
        <AvatarFallback>{{ initials }}</AvatarFallback>
      </Avatar>
      <div class="min-w-0">
        <p class="truncate font-medium">
          {{ conversation.contactName }}
        </p>
        <p class="truncate text-xs text-muted-foreground">
          {{ conversation.contactPhone }}
        </p>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <Select
        :model-value="conversation.status"
        @update:model-value="emit('statusChange', $event as WhatsAppConversation['status'])"
      >
        <SelectTrigger class="h-8 w-[130px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="open">
            Aberta
          </SelectItem>
          <SelectItem value="pending">
            Pendente
          </SelectItem>
          <SelectItem value="resolved">
            Resolvida
          </SelectItem>
          <SelectItem value="spam">
            Spam
          </SelectItem>
        </SelectContent>
      </Select>
      <WhatsAppStatusBadge :status="conversation.status" class="hidden sm:inline-flex" />
    </div>
  </div>
</template>
