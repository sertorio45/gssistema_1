import type {
  CreateWhatsAppContactPayload,
  UpdateWhatsAppContactPayload,
  WhatsAppContact,
} from '~/types/whatsapp'

export function useWhatsAppContacts() {
  const { tenantId } = useTenant()
  const search = ref('')
  const page = ref(1)
  const limit = ref(20)

  const cacheKey = computed(
    () => `whatsapp-contacts-${tenantId.value}-${search.value}-${page.value}`,
  )

  const { data, pending, refresh } = useAsyncData(
    cacheKey,
    async () => {
      if (!tenantId.value)
        return { data: [] as WhatsAppContact[], total: 0, page: 1, limit: 20 }

      return $fetch<{ data: WhatsAppContact[], total: number, page: number, limit: number }>(
        '/api/whatsapp/contacts',
        {
          query: {
            tenant_id: tenantId.value,
            search: search.value || undefined,
            page: page.value,
            limit: limit.value,
          },
        },
      )
    },
    { watch: [tenantId, search, page, limit], default: () => ({ data: [], total: 0, page: 1, limit: 20 }), server: false },
  )

  const contacts = computed(() => data.value?.data || [])
  const total = computed(() => data.value?.total || 0)

  async function createContact(payload: Omit<CreateWhatsAppContactPayload, 'tenant_id'>) {
    const response = await $fetch<{ data: WhatsAppContact }>('/api/whatsapp/contacts', {
      method: 'POST',
      body: { ...payload, tenant_id: tenantId.value },
    })
    await refresh()
    return response.data
  }

  async function updateContact(id: string, payload: Omit<UpdateWhatsAppContactPayload, 'tenant_id'>) {
    const response = await $fetch<{ data: WhatsAppContact }>(`/api/whatsapp/contacts/${id}`, {
      method: 'PUT',
      body: { ...payload, tenant_id: tenantId.value },
    })
    await refresh()
    return response.data
  }

  async function deleteContact(id: string) {
    await $fetch(`/api/whatsapp/contacts/${id}`, {
      method: 'DELETE',
      query: { tenant_id: tenantId.value },
    })
    await refresh()
  }

  async function syncToCrm(id: string, options: { createIfMissing?: boolean, crmContactId?: string } = {}) {
    const response = await $fetch<{
      data: WhatsAppContact
      crmContact: { id: string, name: string, email: string }
      lead: { id: string, name: string, funnelId: string | null, salesStageId: string | null } | null
      leadCreated: boolean
    }>(
      `/api/whatsapp/contacts/${id}/sync-crm`,
      {
        method: 'POST',
        body: {
          tenant_id: tenantId.value,
          create_if_missing: options.createIfMissing ?? true,
          crm_contact_id: options.crmContactId,
          create_lead: true,
        },
      },
    )
    await refresh()
    return response
  }

  async function fetchContact(id: string) {
    return $fetch<{ data: import('~/types/whatsapp').WhatsAppContactDetail }>(
      `/api/whatsapp/contacts/${id}`,
      { query: { tenant_id: tenantId.value } },
    )
  }

  return {
    contacts,
    total,
    pending,
    search,
    page,
    limit,
    refresh,
    createContact,
    updateContact,
    deleteContact,
    syncToCrm,
    fetchContact,
  }
}
