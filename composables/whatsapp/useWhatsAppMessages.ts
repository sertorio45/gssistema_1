import type { WhatsAppMessage } from '~/types/whatsapp'

const POLL_INTERVAL_MS = 5000

function sortMessages(messages: WhatsAppMessage[]) {
  return [...messages].sort((a, b) => {
    const aTime = new Date(a.sentAt || a.createdAt).getTime()
    const bTime = new Date(b.sentAt || b.createdAt).getTime()
    return aTime - bTime
  })
}

function mergeMessages(current: WhatsAppMessage[], remote: WhatsAppMessage[]) {
  const byId = new Map<string, WhatsAppMessage>()
  for (const message of current)
    byId.set(message.id, message)

  for (const message of remote) {
    const existing = byId.get(message.id)
    byId.set(message.id, existing ? { ...existing, ...message } : message)
  }

  return sortMessages(Array.from(byId.values()))
}

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

  const initialLoading = computed(
    () => pending.value && messages.value.length === 0,
  )

  const sending = ref(false)
  let pollTimer: ReturnType<typeof setInterval> | null = null

  async function fetchMessages() {
    if (!tenantId.value || !conversationId.value)
      return [] as WhatsAppMessage[]

    const response = await $fetch<{ data: WhatsAppMessage[] }>(
      `/api/whatsapp/conversations/${conversationId.value}/messages`,
      { query: { tenant_id: tenantId.value } },
    )
    return response.data || []
  }

  async function syncMessages() {
    if (!tenantId.value || !conversationId.value || pending.value)
      return

    try {
      const remote = await fetchMessages()
      data.value = mergeMessages(data.value || [], remote)
    }
    catch {
      /* non-blocking poll */
    }
  }

  function startPolling() {
    stopPolling()
    if (!import.meta.client)
      return

    pollTimer = setInterval(() => {
      syncMessages()
    }, POLL_INTERVAL_MS)
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  watch(conversationId, (id, previousId) => {
    if (id === previousId)
      return

    if (id) {
      startPolling()
      return
    }

    stopPolling()
    data.value = []
  }, { immediate: true })

  onUnmounted(stopPolling)

  function appendMessage(message: WhatsAppMessage) {
    if (message.conversationId !== conversationId.value)
      return
    const exists = (data.value || []).some(m => m.id === message.id)
    if (exists)
      return
    data.value = sortMessages([...(data.value || []), message])
  }

  function updateMessage(message: WhatsAppMessage) {
    if (message.conversationId !== conversationId.value)
      return
    data.value = mergeMessages(data.value || [], [message])
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
      updateMessage(response.data)
      return response.data
    }
    finally {
      sending.value = false
    }
  }

  return {
    messages,
    pending,
    initialLoading,
    sending,
    refresh,
    appendMessage,
    updateMessage,
    sendMessage,
    syncMessages,
  }
}
