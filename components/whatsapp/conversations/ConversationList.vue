<script setup lang="ts">
import type { WhatsAppConversation } from '~/types/whatsapp'

import ConversationFilters from '~/components/whatsapp/conversations/ConversationFilters.vue'
import ConversationListItem from '~/components/whatsapp/conversations/ConversationListItem.vue'
import { Skeleton } from '~/components/ui/skeleton'

defineProps<{
  conversations: WhatsAppConversation[]
  activeId?: string | null
  loading?: boolean
}>()

const emit = defineEmits<{
  select: [id: string]
}>()
</script>

<template>
  <div class="flex h-full min-h-0 flex-col border-r bg-background">
    <ConversationFilters />
    <div class="flex-1 overflow-y-auto">
      <div v-if="loading" class="space-y-0 p-4">
        <Skeleton v-for="i in 6" :key="i" class="mb-3 h-16 w-full" />
      </div>
      <div v-else-if="!conversations.length" class="p-6 text-center text-sm text-muted-foreground">
        Nenhuma conversa encontrada
      </div>
      <ConversationListItem
        v-for="conversation in conversations"
        :key="conversation.id"
        :conversation="conversation"
        :active="conversation.id === activeId"
        @select="emit('select', conversation.id)"
      />
    </div>
  </div>
</template>
