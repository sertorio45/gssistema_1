import type { WhatsAppModuleSettings } from '~/types/whatsapp'

export function useWhatsAppSettings() {
  const { tenantId } = useTenant()

  const cacheKey = computed(() => `whatsapp-settings-${tenantId.value}`)

  const { data, pending, refresh } = useAsyncData(
    cacheKey,
    async () => {
      if (!tenantId.value)
        return null

      const response = await $fetch<{ data: WhatsAppModuleSettings }>('/api/whatsapp/settings', {
        query: { tenant_id: tenantId.value },
      })
      return response.data
    },
    { watch: [tenantId], server: false },
  )

  async function saveSettings(payload: {
    general?: Partial<WhatsAppModuleSettings['general']>
    llm?: Partial<WhatsAppModuleSettings['llm']>
  }) {
    const response = await $fetch<{ data: WhatsAppModuleSettings }>('/api/whatsapp/settings', {
      method: 'PUT',
      body: { ...payload, tenant_id: tenantId.value },
    })
    await refresh()
    return response.data
  }

  async function testOllama(model?: string) {
    return $fetch<{ data: { ok: true, model: string, reply: string } }>('/api/whatsapp/settings/test-ollama', {
      method: 'POST',
      body: { tenant_id: tenantId.value, model },
    })
  }

  return {
    settings: computed(() => data.value),
    pending,
    refresh,
    saveSettings,
    testOllama,
  }
}
