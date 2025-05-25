//Esse arquivo é responsável por gerenciar o tenantId e os tenants para a página de listagem de tenants
import { useSupabaseClient } from '#imports'
import { computed, onMounted, ref, watch } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { useTenantStore } from '~/stores/tenant'

const tenantId = ref<string | null>(null)
const tenants = ref<any[]>([])

onMounted(() => {
  const savedTenant = localStorage.getItem('tenantId')
  if (savedTenant) {
    tenantId.value = savedTenant
  }
})

watch(tenantId, (newVal) => {
  if (newVal) {
    localStorage.setItem('tenantId', newVal)
  }
  else {
    localStorage.removeItem('tenantId')
  }
})

function setTenantId(newTenantId: string | null) {
  tenantId.value = newTenantId
}

async function listTenants() {
  const supabase = useSupabaseClient()
  const { data, error } = await supabase
    .from('tenant')
    .select('*')
    .order('name')
  if (error) {
    throw error
  }
  tenants.value = data || []
  return tenants.value
}

const currentTenant = computed(() => {
  return tenants.value.find(t => t.id === tenantId.value) || null
})

export function useTenant() {
  const tenantStore = useTenantStore()
  // Sincronizar tenantId com o valor do Pinia store
  watch(() => tenantStore.tenantId, (val) => {
    tenantId.value = val
  }, { immediate: true })

  const supabase = useSupabaseClient()
  const { currentRole } = useAuth()

  // Restaura o último tenant salvo no localStorage
  function restoreLastTenant() {
    if (import.meta.client) {
      const lastTenantId = localStorage.getItem('current-tenant-id')
      if (lastTenantId) {
        setTenant(lastTenantId)
      }
    }
  }

  // Seleciona o tenant pelo UUID e salva no store/localStorage
  function setCurrentTenantById(id: string) {
    setTenantId(id)
    if (import.meta.client) {
      localStorage.setItem('current-tenant-id', id)
    }
  }

  // Seleciona o tenant pelo slug e salva no store/localStorage
  async function setCurrentTenantBySlug(slug: string) {
    const { data, error } = await supabase
      .from('tenant')
      .select('*')
      .eq('slug', slug)
      .single()
    if (error) {
      throw error
    }
    if (data && data.id) {
      setTenantId(data.id)
    }
    else {
      throw new Error('Tenant não encontrado')
    }
  }

  // Função protegida: só permite setar tenant se não for cliente
  function setTenant(tenantId: string) {
    if (currentRole.value !== 'cliente') {
      tenantStore.setTenant(tenantId)
      if (import.meta.client) {
        localStorage.setItem('current-tenant-id', tenantId)
      }
    }
  }

  // Nova função: seta o tenantId do JWT no store
  async function setTenantFromJWT() {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      const payload = JSON.parse(atob(session.access_token.split('.')[1]))
      // Pega o primeiro tenantId do objeto tenant_roles
      const tenantRoles = payload.app_metadata?.tenant_roles
      const tenantId = tenantRoles ? Object.keys(tenantRoles)[0] : null
      if (tenantId) {
        tenantStore.setTenant(tenantId)
        if (import.meta.client) {
          localStorage.setItem('current-tenant-id', tenantId)
        }
      }
    }
  }

  return {
    tenantId,
    setTenant,
    clearTenant: tenantStore.clearTenant,
    listTenants,
    restoreLastTenant,
    setCurrentTenantById,
    setCurrentTenantBySlug,
    currentTenant,
    setTenantFromJWT,
    setTenantId,
    tenants,
  }
}
