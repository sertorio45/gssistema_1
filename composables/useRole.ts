import { useSupabaseClient } from '#imports'
import { computed, ref } from 'vue'

export function useRole() {
  const userRole = ref<string | null>(null)

  function decodeJWT(token: string) {
    try {
      const base64Url = token.split('.')[1]
      if (!base64Url) {
        return null
      }
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        atob(base64).split('').map((c) => {
          return `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`
        }).join(''),
      )
      return JSON.parse(jsonPayload)
    }
    catch {
      return null
    }
  }

  async function fetchUserRole() {
    const client = useSupabaseClient()
    const { data: { session } } = await client.auth.getSession()
    if (session?.access_token) {
      const decoded = decodeJWT(session.access_token)
      const tenantRoles = decoded?.app_metadata?.tenant_roles || {}
      // Obter tenantId atual do store
      let tenantId = null
      try {
        const { useTenantStore } = await import('~/stores/tenant')
        tenantId = useTenantStore().tenantId
      }
      catch {}
      let role = null
      if (tenantId && tenantRoles[tenantId]) {
        role = tenantRoles[tenantId]
      }
      else {
        // Fallback: pega o primeiro role disponível
        const firstTenant = Object.keys(tenantRoles)[0]
        if (firstTenant) {
          role = tenantRoles[firstTenant]
        }
      }
      userRole.value = role
    }
    else {
      userRole.value = null
    }
  }

  // Computed properties para verificações comuns
  const isAdmin = computed(() => userRole.value === 'admin')
  const isCliente = computed(() => userRole.value === 'cliente')
  const isFuncionario = computed(() => userRole.value === 'funcionario')

  // Função para verificar se o usuário tem uma role específica
  function hasRole(role: string | string[]): boolean {
    if (!userRole.value) {
      return false
    }
    if (Array.isArray(role)) {
      return role.includes(userRole.value)
    }
    return userRole.value === role
  }

  return {
    userRole,
    fetchUserRole,
    isAdmin,
    isCliente,
    isFuncionario,
    hasRole,
  }
}
