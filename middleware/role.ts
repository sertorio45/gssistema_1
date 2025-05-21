export default defineNuxtRouteMiddleware(async (to, _from) => {
  const user = useSupabaseUser()
  const client = useSupabaseClient()

  // Se não há usuário logado ou o route não tem definições de roles necessárias
  if (!user.value || !to.meta.requiredRoles) {
    return
  }

  // Rotas públicas que não precisam de autenticação/role
  const publicPages = ['/login', '/register', '/forgot-password', '/403', '/404', '/confirm']

  try {
    // Obter o token da sessão
    const { data: { session } } = await client.auth.getSession()

    if (!session?.access_token) {
      if (!publicPages.includes(to.path)) {
        return navigateTo('/login')
      }
      return
    }

    // Decodificar o JWT para obter as informações da role
    const decodedToken = decodeJWT(session.access_token)

    // Buscar role do tenant atual
    const tenantRoles = decodedToken?.app_metadata?.tenant_roles || {}
    let tenantSlug = null
    try {
      const { useTenantStore } = await import('~/stores/tenant')
      tenantSlug = useTenantStore().tenantId
    } catch {}
    let userRole = null
    if (tenantSlug && tenantRoles[tenantSlug]) {
      userRole = tenantRoles[tenantSlug]
    } else {
      const firstTenant = Object.keys(tenantRoles)[0]
      if (firstTenant) {
        userRole = tenantRoles[firstTenant]
        tenantSlug = firstTenant
      }
    }
    // Log para debug
    // eslint-disable-next-line no-console
    console.log('[middleware/role] tenantSlug:', tenantSlug, 'userRole:', userRole)

    const requiredRoles = Array.isArray(to.meta.requiredRoles)
      ? to.meta.requiredRoles
      : [to.meta.requiredRoles]

    // Se não encontrou role, só bloqueia se não for rota pública
    if (!userRole) {
      if (!publicPages.includes(to.path)) {
        return navigateTo('/403')
      }
      return
    }

    // Verificar se o usuário tem a role necessária
    if (!requiredRoles.includes(userRole)) {
      console.warn(`Acesso negado: usuário tem role ${userRole}, mas precisa de ${requiredRoles.join(', ')}`)
      return navigateTo('/403')
    }
  }
  catch (error) {
    console.error('Erro ao verificar permissões:', error)
    if (!publicPages.includes(to.path)) {
      return navigateTo('/')
    }
    return
  }
})

/**
 * Decodifica um token JWT sem verificar a assinatura
 * @param token JWT token
 * @returns payload decodificado ou null se inválido
 */
function decodeJWT(token: string) {
  try {
    const base64Url = token.split('.')[1]
    if (!base64Url)
      return null

    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64).split('').map((c) => {
        return `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`
      }).join(''),
    )
    return JSON.parse(jsonPayload)
  }
  catch (e) {
    console.error('Erro ao decodificar JWT:', e)
    return null
  }
}
