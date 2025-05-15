export default defineNuxtRouteMiddleware(async (to, _from) => {
  const user = useSupabaseUser()
  const client = useSupabaseClient()

  // Se não há usuário logado ou o route não tem definições de roles necessárias
  if (!user.value || !to.meta.requiredRoles) {
    return
  }

  try {
    // Obter o token da sessão
    const { data: { session } } = await client.auth.getSession()

    if (!session?.access_token) {
      return navigateTo('/')
    }

    // Decodificar o JWT para obter as informações da role
    const decodedToken = decodeJWT(session.access_token)

    // Verificar se o token contém a informação de role no app_metadata
    if (!decodedToken || !decodedToken.app_metadata || !decodedToken.app_metadata.role) {
      console.error('Token não contém informações de role no app_metadata')
      return navigateTo('/')
    }

    const userRole = decodedToken.app_metadata.role
    const requiredRoles = Array.isArray(to.meta.requiredRoles)
      ? to.meta.requiredRoles
      : [to.meta.requiredRoles]

    // Verificar se o usuário tem a role necessária
    if (!requiredRoles.includes(userRole)) {
      console.warn(`Acesso negado: usuário tem role ${userRole}, mas precisa de ${requiredRoles.join(', ')}`)
      return navigateTo('/403')
    }
  }
  catch (error) {
    console.error('Erro ao verificar permissões:', error)
    return navigateTo('/')
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
