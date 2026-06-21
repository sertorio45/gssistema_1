import type { WhatsAppMessage } from '~/types/whatsapp'

export function useWhatsAppMessages(conversationId: Ref<string | null>) {
  const { tenantId } = useTenant()

  const cacheKey = computed(
    () => `whatsapp-messages-${tenantId.value}-${conversationId.value}`,
  )

  const { data, pending, refresh } = useAsyncData(
    cacheKey,
    async () => {
      if (!tenantId.value || !conversationId.value)
        return [] as WhatsAppMessage[]

      const response = await $fetch<{ data: WhatsAppMessage[] }>(
        `/api/whatsapp/conversations/${conversationId.value}/messages`,
        { query: { tenant_id: tenantId.value } },
      )
      return response.data || []
    },
    { watch: [tenantId, conversationId], default: () => [], server: false },
  )

  const messages = computed({
    get: () => data.value || [],
    set: (value: WhatsAppMessage[]) => {
      data.value = value
    },
  })

  const sending = ref(false)

  function appendMessage(message: WhatsAppMessage) {
    if (message.conversationId !== conversationId.value)
      return
    const exists = (data.value || []).some(m => m.id === message.id)
    if (exists)
      return
    data.value = [...(data.value || []), message]
  }

  function updateMessage(message: WhatsAppMessage) {
    if (message.conversationId !== conversationId.value)
      return
    const list = [...(data.value || [])]
    const index = list.findIndex(m => m.id === message.id || m.externalId === message.externalId)
    if (index >= 0)
      list[index] = { ...list[index], ...message }
    else
      list.push(message)
    data.value = list
  }

  async function sendMessage(content: string) {
    if (!conversationId.value || !content.trim())
      return null

    sending.value = true
    try {
      const response = await $fetch<{ data: WhatsAppMessage }>('/api/whatsapp/messages', {
        method: 'POST',
        body: {
          tenant_id: tenantId.value,
          conversation_id: conversationId.value,
          content: content.trim(),
        },
      })
      appendMessage(response.data)
      return response.data
    }
    finally {
      sending.value = false
    }
  }

  return {
    messages,
    pending,
    sending,
    refresh,
    appendMessage,
    updateMessage,
    sendMessage,
  }
}
