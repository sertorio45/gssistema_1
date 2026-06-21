<script setup lang="ts">
import ChatPanel from '~/components/whatsapp/conversations/ChatPanel.vue'
import ConversationDetails from '~/components/whatsapp/conversations/ConversationDetails.vue'
import ConversationList from '~/components/whatsapp/conversations/ConversationList.vue'
import { toast } from 'vue-sonner'

const route = useRoute()
const router = useRouter()
const inboxStore = useWhatsAppInboxStore()

const {
  conversations,
  pending: conversationsPending,
  upsertConversation,
  markAsRead,
  updateConversation,
} = useWhatsAppConversations()

const activeId = computed({
  get: () => inboxStore.activeConversationId || (route.params.id as string) || null,
  set: (id: string | null) => {
    inboxStore.setActiveConversation(id)
    if (id) {
      router.replace({ path: '/whatsapp/conversations', query: { id } })
    }
    else {
      router.replace({ path: '/whatsapp/conversations' })
    }
  },
})

const activeConversation = computed(
  () => conversations.value.find(c => c.id === activeId.value) || null,
)

const activeIdRef = computed(() => activeId.value)
const {
  messages,
  pending: messagesPending,
  sending,
  appendMessage,
  updateMessage,
  sendMessage,
} = useWhatsAppMessages(activeIdRef)

useWhatsAppRealtime({
  onMessage: (message) => {
    if (message.conversationId === activeId.value) {
      updateMessage(message)
      if (!message.fromMe)
        markAsRead(activeId.value!)
    }
    else if (!message.fromMe && message.conversationId) {
      const conv = conversations.value.find(c => c.id === message.conversationId)
      if (conv) {
        upsertConversation({
          ...conv,
          unreadCount: conv.unreadCount + 1,
          lastMessagePreview: message.content,
          lastMessageAt: message.sentAt || message.createdAt,
        })
      }
    }
  },
  onConversationUpdate: (conversation) => {
    upsertConversation(conversation)
  },
})

watch(activeId, async (id) => {
  if (!id)
    return
  const conv = conversations.value.find(c => c.id === id)
  if (conv?.unreadCount) {
    try {
      await markAsRead(id)
    }
    catch {
      /* non-blocking */
    }
  }
}, { immediate: true })

watch(
  () => route.query.id,
  (id) => {
    if (typeof id === 'string' && id !== activeId.value)
      activeId.value = id
  },
  { immediate: true },
)

async function handleSelect(id: string) {
  activeId.value = id
}

async function handleSend(content: string) {
  try {
    await sendMessage(content)
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || error?.message || 'Erro ao enviar mensagem')
  }
}

async function handleStatusChange(status: import('~/types/whatsapp').WhatsAppConversationStatus) {
  if (!activeId.value)
    return
  try {
    await updateConversation(activeId.value, { status })
    toast.success('Status atualizado')
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || error?.message || 'Erro ao atualizar status')
  }
}
</script>

<template>
  <div class="flex h-[calc(100vh-8rem)] min-h-[560px] overflow-hidden rounded-xl border bg-background shadow-sm">
    <div class="w-full shrink-0 md:w-80 lg:w-96" :class="activeId && 'hidden md:block'">
      <ConversationList
        :conversations="conversations"
        :active-id="activeId"
        :loading="conversationsPending"
        @select="handleSelect"
      />
    </div>

    <div class="min-w-0 flex-1" :class="!activeId && 'hidden md:flex md:flex-col'">
      <div v-if="activeId" class="flex items-center border-b px-3 py-2 md:hidden">
        <button type="button" class="text-sm text-primary" @click="activeId = null">
          ← Voltar
        </button>
      </div>
      <ChatPanel
        :conversation="activeConversation"
        :messages="messages"
        :loading="messagesPending"
        :sending="sending"
        @send="handleSend"
        @status-change="handleStatusChange"
      />
    </div>

    <ConversationDetails :conversation="activeConversation" />
  </div>
</template>
