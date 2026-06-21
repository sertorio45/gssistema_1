import type { WhatsAppAgentToolType, WhatsAppLlmProvider } from '~/types/whatsapp'

export function useWhatsAppAgents() {
  const { tenantId } = useTenant()

  const cacheKey = computed(() => `whatsapp-agents-${tenantId.value}`)

  const { data, pending, refresh } = useAsyncData(
    cacheKey,
    async () => {
      if (!tenantId.value)
        return [] as import('~/types/whatsapp').WhatsAppAgent[]

      const response = await $fetch<{ data: import('~/types/whatsapp').WhatsAppAgent[] }>('/api/whatsapp/agents', {
        query: { tenant_id: tenantId.value },
      })
      return response.data || []
    },
    { watch: [tenantId], default: () => [], server: false },
  )

  const agents = computed(() => data.value || [])

  async function createAgent(payload: {
    name: string
    description?: string
    llm_provider?: WhatsAppLlmProvider
    model?: string
    system_prompt?: string
    temperature?: number
    max_tokens?: number
    is_active?: boolean
  }) {
    const response = await $fetch<{ data: import('~/types/whatsapp').WhatsAppAgent }>('/api/whatsapp/agents', {
      method: 'POST',
      body: { ...payload, tenant_id: tenantId.value },
    })
    await refresh()
    return response.data
  }

  async function updateAgent(agentId: string, payload: {
    name?: string
    description?: string
    llm_provider?: WhatsAppLlmProvider
    model?: string
    system_prompt?: string
    temperature?: number
    max_tokens?: number
    is_active?: boolean
  }) {
    const response = await $fetch<{ data: import('~/types/whatsapp').WhatsAppAgent }>(`/api/whatsapp/agents/${agentId}`, {
      method: 'PUT',
      body: { ...payload, tenant_id: tenantId.value },
    })
    await refresh()
    return response.data
  }

  async function testAgent(agentId: string, message: string) {
    return $fetch<{ data: { reply: string, tokensUsed: number } }>(`/api/whatsapp/agents/${agentId}/test`, {
      method: 'POST',
      body: { tenant_id: tenantId.value, message },
    })
  }

  async function addAgentTool(agentId: string, payload: {
    name: string
    type?: WhatsAppAgentToolType
    description?: string
    mcp_server?: string
    mcp_tool_name?: string
  }) {
    return $fetch(`/api/whatsapp/agents/${agentId}/tools`, {
      method: 'POST',
      body: { ...payload, tenant_id: tenantId.value },
    })
  }

  async function removeAgentTool(agentId: string, toolId: string) {
    return $fetch(`/api/whatsapp/agents/${agentId}/tools/${toolId}`, {
      method: 'DELETE',
      query: { tenant_id: tenantId.value },
    })
  }

  return {
    agents,
    pending,
    refresh,
    createAgent,
    updateAgent,
    testAgent,
    addAgentTool,
    removeAgentTool,
  }
}
