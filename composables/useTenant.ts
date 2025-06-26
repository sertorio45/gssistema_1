// Esse arquivo é responsável por gerenciar o tenantId e os tenants para a página de listagem de tenants
import { useSupabaseClient } from '#imports'
import { computed, onMounted, ref, watch } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { useTenantStore } from '~/stores/tenant'

const tenantId = ref<string | null>(null)
const tenants = ref<any[]>([])

// Unifica a persistência do tenant usando apenas 'current-tenant-id'
function setTenantId(newTenantId: string | null) {
  tenantId.value = newTenantId
  const tenantStore = useTenantStore()
  tenantStore.setTenant(newTenantId ?? '')
  if (import.meta.client) {
    if (newTenantId) {
      localStorage.setItem('current-tenant-id', newTenantId)
    } else {
      localStorage.removeItem('current-tenant-id')
    }
  }
}

// Restaura o tenant salvo no localStorage ao iniciar
function restoreLastTenant() {
  if (import.meta.client) {
    const lastTenantId = localStorage.getItem('current-tenant-id')
    if (lastTenantId) {
      setTenantId(lastTenantId)
    }
  }
}

// Listener global para evento de troca de tenant
if (import.meta.client) {
  window.addEventListener('tenant-changed', (event: Event) => {
    const customEvent = event as CustomEvent
    if (customEvent.detail?.tenantId) {
      setTenantId(customEvent.detail.tenantId)
    }
  })
}

watch(tenantId, (newVal) => {
  if (import.meta.client) {
    if (newVal) {
      localStorage.setItem('current-tenant-id', newVal)
    } else {
      localStorage.removeItem('current-tenant-id')
    }
  }
  useTenantStore().setTenant(newVal ?? '')
})

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
  const supabase = useSupabaseClient()
  const { currentRole } = useAuth()

  // Sincronizar tenantId com o valor do Pinia store
  watch(() => tenantStore.tenantId, (val) => {
    if (val !== tenantId.value) {
      setTenantId(val)
    }
  }, { immediate: true })

  // Seleciona o tenant pelo UUID e salva no store/localStorage
  function setCurrentTenantById(id: string) {
    setTenantId(id)
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
    } else {
      throw new Error('Tenant não encontrado')
    }
  }

  // Função protegida: só permite setar tenant se não for cliente
  function setTenant(newTenantId: string) {
    if (currentRole.value !== 'cliente' && newTenantId) {
      setTenantId(newTenantId)
    }
  }

  // Nova função: seta o tenantId do JWT no store
  async function setTenantFromJWT() {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      const payload = JSON.parse(atob(session.access_token.split('.')[1]))
      // Pega o primeiro tenantId do objeto tenant_roles
      const tenantRoles = payload.app_metadata?.tenant_roles
      const jwtTenantId = tenantRoles ? Object.keys(tenantRoles)[0] : null
      if (jwtTenantId) {
        setTenantId(jwtTenantId)
      }
    }
  }

  // Restaura o tenant salvo ao iniciar
  onMounted(() => {
    restoreLastTenant()
  })

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
