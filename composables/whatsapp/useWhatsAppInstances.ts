import type {
  CreateWhatsAppInstancePayload,
  WhatsAppInstanceView,
} from '~/types/whatsapp'

export function useWhatsAppInstances() {
  const { tenantId } = useTenant()
  const cacheKey = computed(() => `whatsapp-instances-${tenantId.value}`)

  const { data, pending, refresh, error } = useAsyncData(
    cacheKey,
    async () => {
      if (!tenantId.value)
        return { instances: [] as WhatsAppInstanceView[], totalUnread: 0 }

      const response = await $fetch<{
        data: WhatsAppInstanceView[]
        meta?: { totalUnread?: number, totalConversations?: number }
      }>('/api/whatsapp/instances', {
        query: { tenant_id: tenantId.value },
      })
      return {
        instances: response.data || [],
        totalUnread: response.meta?.totalUnread ?? 0,
      }
    },
    { watch: [tenantId], default: () => ({ instances: [], totalUnread: 0 }), server: false },
  )

  const instances = computed(() => data.value?.instances || [])
  const totalUnread = computed(() => data.value?.totalUnread ?? 0)

  async function createInstance(payload: Omit<CreateWhatsAppInstancePayload, 'tenant_id'>) {
    const response = await $fetch<{ data: WhatsAppInstanceView, webhookUrl: string }>(
      '/api/whatsapp/instances',
      {
        method: 'POST',
        body: {
          ...payload,
          tenant_id: tenantId.value,
        },
      },
    )
    await refresh()
    return response
  }

  async function deleteInstance(id: string) {
    await $fetch(`/api/whatsapp/instances/${id}`, {
      method: 'DELETE',
      query: { tenant_id: tenantId.value },
    })
    await refresh()
  }

  async function connectInstance(id: string) {
    const response = await $fetch<{
      data: {
        status: string
        qrCode: string | null
        pairingCode?: string | null
        alreadyConnected?: boolean
        phoneNumber?: string | null
      }
    }>(
      `/api/whatsapp/instances/${id}/connect`,
      {
        method: 'POST',
        query: { tenant_id: tenantId.value },
      },
    )
    await refresh()
    return response.data
  }

  async function disconnectInstance(id: string) {
    await $fetch(`/api/whatsapp/instances/${id}/disconnect`, {
      method: 'POST',
      query: { tenant_id: tenantId.value },
    })
    await refresh()
  }

  async function pollStatus(id: string) {
    const response = await $fetch<{ data: { status: string, phoneNumber?: string, qrCode?: string | null } }>(
      `/api/whatsapp/instances/${id}/status`,
      { query: { tenant_id: tenantId.value } },
    )
    await refresh()
    return response.data
  }

  async function testConnection(id: string) {
    return $fetch(`/api/whatsapp/instances/${id}/test`, {
      method: 'POST',
      query: { tenant_id: tenantId.value },
    })
  }

  async function discoverEvolutionInstances(payload: { api_url: string, api_token: string }) {
    return $fetch<{ data: import('~/types/whatsapp').EvolutionRemoteInstanceView[] }>(
      '/api/whatsapp/instances/discover',
      {
        method: 'POST',
        body: {
          ...payload,
          tenant_id: tenantId.value,
        },
      },
    )
  }

  async function syncInstance(id: string) {
    const response = await $fetch<{
      success: boolean
      webhookUrl: string
      data: { status: string, phoneNumber?: string }
    }>(`/api/whatsapp/instances/${id}/sync`, {
      method: 'POST',
      query: { tenant_id: tenantId.value },
    })
    await refresh()
    return response
  }

  return {
    instances,
    totalUnread,
    pending,
    error,
    refresh,
    createInstance,
    deleteInstance,
    connectInstance,
    disconnectInstance,
    pollStatus,
    testConnection,
    discoverEvolutionInstances,
    syncInstance,
  }
}
