<script setup lang="ts">
import type { Product } from '~/types/crm'
import type { WhatsAppConversation, WhatsAppConversationLead } from '~/types/whatsapp'

import ChatPanel from '~/components/whatsapp/conversations/ChatPanel.vue'
import ConversationDetails from '~/components/whatsapp/conversations/ConversationDetails.vue'
import ConversationList from '~/components/whatsapp/conversations/ConversationList.vue'
import { toast } from 'vue-sonner'

const route = useRoute()
const router = useRouter()
const inboxStore = useWhatsAppInboxStore()
const { tenantId } = useTenant()

const {
  conversations,
  pending: conversationsPending,
  upsertConversation,
  markAsRead,
  updateConversation,
  deleteConversation,
  syncConversationToCrm,
  fetchConversationAgent,
  fetchConversationLead,
  updateConversationLead,
  setConversationAgent,
} = useWhatsAppConversations()

const { agents, pending: agentsPending } = useWhatsAppAgents()

const conversationLead = ref<WhatsAppConversationLead | null>(null)
const resolvedConversation = ref<WhatsAppConversation | null>(null)
const metaLoadingId = ref<string | null>(null)

const { data: crmProducts, pending: productsPending } = useAsyncData(
  () => `crm-products-inbox-${tenantId.value}`,
  async () => {
    if (!tenantId.value)
      return [] as Product[]

    return $fetch<Product[]>('/api/crm/products', {
      query: {
        tenant_id: tenantId.value,
        active: 'true',
      },
    })
  },
  { watch: [tenantId], default: () => [], server: false },
)

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, '')
}

const activeId = computed({
  get: () => {
    const fromQuery = typeof route.query.id === 'string' ? route.query.id : null
    return inboxStore.activeConversationId || fromQuery || null
  },
  set: (id: string | null) => {
    inboxStore.setActiveConversation(id)

    const currentQueryId = typeof route.query.id === 'string' ? route.query.id : null
    if (currentQueryId === id)
      return

    if (id)
      router.replace({ path: '/whatsapp/conversations', query: { id } })
    else
      router.replace({ path: '/whatsapp/conversations' })
  },
})

const messagesConversationId = computed(() => resolvedConversation.value?.id || activeId.value)

const isResolvingConversation = computed(
  () => Boolean(activeId.value && !resolvedConversation.value),
)

const {
  messages,
  initialLoading: messagesLoading,
  sending,
  updateMessage,
  sendMessage,
} = useWhatsAppMessages(messagesConversationId)

async function fetchConversationById(id: string) {
  return $fetch<{ data: WhatsAppConversation }>(`/api/whatsapp/conversations/${id}`, {
    query: { tenant_id: tenantId.value },
  })
}

function findConversationByPhone(phone: string) {
  const phoneKey = normalizePhone(phone)
  return conversations.value.find(item => normalizePhone(item.contactPhone) === phoneKey) || null
}

async function resolveConversation(id: string) {
  const fromList = conversations.value.find(item => item.id === id)
  if (fromList) {
    resolvedConversation.value = fromList
    return fromList
  }

  try {
    const response = await fetchConversationById(id)
    upsertConversation(response.data)
    resolvedConversation.value = response.data
    return response.data
  }
  catch {
    const cached = resolvedConversation.value
    if (cached?.id === id) {
      const replacement = findConversationByPhone(cached.contactPhone)
      if (replacement) {
        activeId.value = replacement.id
        resolvedConversation.value = replacement
        return replacement
      }
    }

    activeId.value = null
    resolvedConversation.value = null
    return null
  }
}

async function loadConversationMeta(id: string, conversation: WhatsAppConversation) {
  if (metaLoadingId.value === id)
    return

  metaLoadingId.value = id

  try {
    if (conversation.unreadCount) {
      try {
        await markAsRead(id)
      }
      catch {
        /* non-blocking */
      }
    }

    try {
      const agentResponse = await fetchConversationAgent(id)
      const current = conversations.value.find(item => item.id === id) || conversation
      const withAgent = {
        ...current,
        activeAgentId: agentResponse.data.agentId,
        activeAgentName: agentResponse.data.agentName,
      }
      upsertConversation(withAgent)

      if (resolvedConversation.value?.id === id)
        resolvedConversation.value = withAgent
    }
    catch {
      /* non-blocking */
    }

    if (conversation.leadId) {
      try {
        const leadResponse = await fetchConversationLead(id)
        conversationLead.value = leadResponse.data
      }
      catch {
        conversationLead.value = null
      }
    }
    else {
      conversationLead.value = null
    }
  }
  finally {
    if (metaLoadingId.value === id)
      metaLoadingId.value = null
  }
}

watch(
  [activeId, () => conversations.value.length],
  async ([id]) => {
    if (!id) {
      resolvedConversation.value = null
      conversationLead.value = null
      return
    }

    const conversation = await resolveConversation(id)
    if (!conversation || conversation.id !== id) {
      if (conversation)
        await loadConversationMeta(conversation.id, conversation)
      return
    }

    resolvedConversation.value = conversation
    await loadConversationMeta(id, conversation)
  },
  { immediate: true },
)

watch(conversations, (list) => {
  if (!activeId.value)
    return

  const match = list.find(item => item.id === activeId.value)
  if (match) {
    resolvedConversation.value = match
    return
  }

  const cached = resolvedConversation.value
  if (!cached)
    return

  const replacement = findConversationByPhone(cached.contactPhone)
  if (replacement && replacement.id !== activeId.value)
    activeId.value = replacement.id
})

watch(
  () => route.query.id,
  (id) => {
    if (typeof id === 'string' && id !== activeId.value)
      activeId.value = id
  },
)

useWhatsAppRealtime({
  onMessage: (message) => {
    const currentId = messagesConversationId.value
    if (message.conversationId === currentId) {
      updateMessage(message)
      if (!message.fromMe && currentId)
        markAsRead(currentId)
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
    if (conversation.id === resolvedConversation.value?.id)
      resolvedConversation.value = conversation
  },
})

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
  const id = resolvedConversation.value?.id
  if (!id)
    return
  try {
    const updated = await updateConversation(id, { status })
    resolvedConversation.value = updated
    toast.success('Status atualizado')
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || error?.message || 'Erro ao atualizar status')
  }
}

async function handleSyncCrm(payload: {
  productId?: string | null
  value?: number
  serviceName?: string | null
}) {
  const id = resolvedConversation.value?.id
  if (!id)
    return
  try {
    const response = await syncConversationToCrm(id, payload)

    if (response.data)
      resolvedConversation.value = response.data

    if (response.lead?.id && (payload.productId || payload.value !== undefined || payload.serviceName)) {
      conversationLead.value = await updateConversationLead(id, {
        value: payload.value,
        serviceName: payload.serviceName,
        productId: payload.productId,
      })
    }
    else if (response.data.leadId) {
      const leadResponse = await fetchConversationLead(id)
      conversationLead.value = leadResponse.data
    }

    if (response.leadCreated)
      toast.success('Contato e lead criados no funil')
    else if (response.lead)
      toast.success('Contato sincronizado com o CRM')
    else
      toast.success('Contato sincronizado com o CRM')
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || error?.message || 'Erro ao sincronizar com o CRM')
  }
}

function handleLeadUpdated(lead: WhatsAppConversationLead) {
  conversationLead.value = lead
}

async function handleDeleteConversation() {
  const id = resolvedConversation.value?.id
  if (!id)
    return
  try {
    await deleteConversation(id)
    activeId.value = null
    resolvedConversation.value = null
    conversationLead.value = null
    toast.success('Conversa excluída')
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || error?.message || 'Erro ao excluir conversa')
  }
}

async function handleAssignChange(userId: string | null) {
  const id = resolvedConversation.value?.id
  if (!id)
    return
  try {
    const updated = await updateConversation(id, { assigned_to: userId })
    resolvedConversation.value = updated
    toast.success(userId ? 'Conversa atribuída' : 'Atribuição removida')
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || error?.message || 'Erro ao atribuir conversa')
  }
}

async function handleAgentChange(payload: { agentId: string | null, enabled: boolean }) {
  const id = resolvedConversation.value?.id
  if (!id)
    return
  try {
    const result = await setConversationAgent(id, payload)
    const current = resolvedConversation.value
    if (current) {
      resolvedConversation.value = {
        ...current,
        activeAgentId: result.agentId,
        activeAgentName: result.agentName,
      }
    }
    if (result.enabled && result.catchUpReplied)
      toast.success('Atendimento por IA ativado — resposta enviada à última mensagem')
    else if (result.enabled)
      toast.success('Atendimento por IA ativado')
    else
      toast.success('Atendimento por IA desativado')
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || error?.message || 'Erro ao configurar agente')
  }
}
</script>

<template>
  <div class="flex h-[calc(100vh-8rem)] min-h-[560px] overflow-hidden rounded-xl border bg-background shadow-sm">
    <div class="w-full shrink-0 md:w-80 lg:w-96" :class="activeId && 'hidden md:block'">
      <ConversationList
        :conversations="conversations"
        :active-id="resolvedConversation?.id || activeId"
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
        :conversation="resolvedConversation"
        :messages="messages"
        :agents="agents"
        :agents-loading="agentsPending"
        :lead="conversationLead"
        :products="crmProducts || []"
        :products-loading="productsPending"
        :loading="messagesLoading || isResolvingConversation"
        :sending="sending"
        @send="handleSend"
        @status-change="handleStatusChange"
        @sync-crm="handleSyncCrm"
        @delete-conversation="handleDeleteConversation"
        @agent-change="handleAgentChange"
        @assign-change="handleAssignChange"
        @lead-updated="handleLeadUpdated"
      />
    </div>

    <ConversationDetails
      :conversation="resolvedConversation"
      :lead="conversationLead"
    />
  </div>
</template>
