import type { WhatsAppConversation, WhatsAppConversationStatus } from '~/types/whatsapp'

export function useWhatsAppConversations() {
  const { tenantId } = useTenant()
  const inboxStore = useWhatsAppInboxStore()

  const queryParams = computed(() => ({
    tenant_id: tenantId.value || undefined,
    status: inboxStore.filters.status === 'all' ? undefined : inboxStore.filters.status,
    search: inboxStore.filters.search || undefined,
    unread_only: inboxStore.filters.unreadOnly ? 'true' : undefined,
  }))

  const cacheKey = computed(
    () => `whatsapp-conversations-${tenantId.value}-${inboxStore.filters.status}-${inboxStore.filters.search}-${inboxStore.filters.unreadOnly}`,
  )

  const { data, pending, refresh } = useAsyncData(
    cacheKey,
    async () => {
      if (!tenantId.value)
        return [] as WhatsAppConversation[]

      const response = await $fetch<{ data: WhatsAppConversation[] }>('/api/whatsapp/conversations', {
        query: queryParams.value,
      })
      return response.data || []
    },
    { watch: [tenantId, queryParams], default: () => [], server: false },
  )

  const conversations = computed({
    get: () => data.value || [],
    set: (value: WhatsAppConversation[]) => {
      data.value = value
    },
  })

  function upsertConversation(conversation: WhatsAppConversation) {
    const list = [...(data.value || [])]
    const index = list.findIndex(c => c.id === conversation.id)
    if (index >= 0)
      list[index] = conversation
    else
      list.unshift(conversation)
    list.sort((a, b) => {
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0
      return bTime - aTime
    })
    data.value = list
  }

  async function updateConversation(
    id: string,
    payload: { status?: WhatsAppConversationStatus, mark_read?: boolean },
  ) {
    const response = await $fetch<{ data: WhatsAppConversation }>(`/api/whatsapp/conversations/${id}`, {
      method: 'PUT',
      body: {
        tenant_id: tenantId.value,
        ...payload,
      },
    })
    upsertConversation(response.data)
    return response.data
  }

  async function markAsRead(id: string) {
    return updateConversation(id, { mark_read: true })
  }

  return {
    conversations,
    pending,
    refresh,
    upsertConversation,
    updateConversation,
    markAsRead,
  }
}
