import type { DrawflowExport } from '~/types/drawflow'
import type {
  CreateWhatsAppFlowPayload,
  SaveWhatsAppFlowCanvasPayload,
  UpdateWhatsAppFlowPayload,
  WhatsAppFlow,
  WhatsAppFlowExecutionSummary,
} from '~/types/whatsapp'

export function useWhatsAppFlows() {
  const { tenantId } = useTenant()

  const statusFilter = ref<WhatsAppFlow['status'] | 'all'>('all')
  const search = ref('')

  const cacheKey = computed(
    () => `whatsapp-flows-${tenantId.value}-${statusFilter.value}-${search.value}`,
  )

  const { data, pending, refresh } = useAsyncData(
    cacheKey,
    async () => {
      if (!tenantId.value)
        return [] as WhatsAppFlow[]

      const response = await $fetch<{ data: WhatsAppFlow[] }>('/api/whatsapp/flows', {
        query: {
          tenant_id: tenantId.value,
          status: statusFilter.value === 'all' ? undefined : statusFilter.value,
          search: search.value || undefined,
        },
      })
      return response.data || []
    },
    { watch: [tenantId, statusFilter, search], default: () => [], server: false },
  )

  const flows = computed(() => data.value || [])

  async function createFlow(payload: Omit<CreateWhatsAppFlowPayload, 'tenant_id'>) {
    const response = await $fetch<{ data: WhatsAppFlow }>('/api/whatsapp/flows', {
      method: 'POST',
      body: { ...payload, tenant_id: tenantId.value },
    })
    await refresh()
    return response.data
  }

  async function updateFlow(id: string, payload: Omit<UpdateWhatsAppFlowPayload, 'tenant_id'>) {
    const response = await $fetch<{ data: WhatsAppFlow }>(`/api/whatsapp/flows/${id}`, {
      method: 'PUT',
      body: { ...payload, tenant_id: tenantId.value },
    })
    await refresh()
    return response.data
  }

  async function saveCanvas(id: string, payload: Omit<SaveWhatsAppFlowCanvasPayload, 'tenant_id'>) {
    const response = await $fetch<{ data: WhatsAppFlow }>(`/api/whatsapp/flows/${id}/canvas`, {
      method: 'PUT',
      body: { ...payload, tenant_id: tenantId.value },
    })
    return response.data
  }

  async function deleteFlow(id: string) {
    await $fetch(`/api/whatsapp/flows/${id}`, {
      method: 'DELETE',
      query: { tenant_id: tenantId.value },
    })
    await refresh()
  }

  async function toggleFlow(id: string) {
    const response = await $fetch<{ data: WhatsAppFlow }>(`/api/whatsapp/flows/${id}/toggle`, {
      method: 'POST',
      query: { tenant_id: tenantId.value },
    })
    await refresh()
    return response.data
  }

  async function testFlow(id: string) {
    return $fetch(`/api/whatsapp/flows/${id}/test`, {
      method: 'POST',
      query: { tenant_id: tenantId.value },
    })
  }

  async function fetchFlow(id: string) {
    return $fetch<{
      data: WhatsAppFlow
      canvas: DrawflowExport | null
      recentExecutions: WhatsAppFlowExecutionSummary[]
    }>(`/api/whatsapp/flows/${id}`, {
      query: { tenant_id: tenantId.value },
    })
  }

  return {
    flows,
    pending,
    search,
    statusFilter,
    refresh,
    createFlow,
    updateFlow,
    saveCanvas,
    deleteFlow,
    toggleFlow,
    testFlow,
    fetchFlow,
  }
}
