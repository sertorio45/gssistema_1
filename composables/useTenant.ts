import { useSupabaseClient } from '#imports'
import { computed, ref } from 'vue'
import { useTenantStore } from '~/stores/tenant'

export function useTenant() {
  const tenantStore = useTenantStore()
  const supabase = useSupabaseClient()
  const tenants = ref<any[]>([])

  // Lista todos os tenants disponíveis
  async function listTenants() {
    const { data, error } = await supabase
      .from('tenant')
      .select('*')
      .order('name')
    if (error) throw error
    tenants.value = data || []
    return tenants.value
  }

  // Restaura o último tenant salvo no localStorage
  function restoreLastTenant() {
    if (import.meta.client) {
      const lastTenantId = localStorage.getItem('current-tenant-id')
      if (lastTenantId) {
        tenantStore.setTenant(lastTenantId)
      }
    }
  }

  // Seleciona o tenant pelo slug e salva no store/localStorage
  async function setCurrentTenantBySlug(slug: string) {
    const { data, error } = await supabase
      .from('tenant')
      .select('*')
      .eq('slug', slug)
      .single()
    if (error) throw error
    if (data && data.id) {
      tenantStore.setTenant(data.id)
      if (import.meta.client) {
        localStorage.setItem('current-tenant-id', data.id)
      }
    } else {
      throw new Error('Tenant não encontrado')
    }
  }

  // Computed para retornar o objeto do tenant atual
  const currentTenant = computed(() => {
    return tenants.value.find(t => t.id === tenantStore.tenantId) || null
  })

  return {
    tenantId: computed(() => tenantStore.tenantId),
    setTenant: tenantStore.setTenant,
    clearTenant: tenantStore.clearTenant,
    listTenants,
    restoreLastTenant,
    setCurrentTenantBySlug,
    currentTenant,
  }
} 