import { useSupabaseClient, useSupabaseUser } from '#imports'
import { useTenant } from '~/composables/useTenant'

export function useAuth() {
  const client = useSupabaseClient()
  const user = useSupabaseUser()
  const router = useRouter()
  const loading = ref(false)
  const error = ref<string | null>(null)
  const userRole = ref<string | null>(null)

  // Função para decodificar JWT
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

  // Função para atualizar o papel do usuário
  const updateUserRole = async () => {
    if (!user.value) {
      userRole.value = null
      return
    }

    try {
      // Obter a sessão atual para extrair o token
      const { data: { session } } = await client.auth.getSession()
      
      if (session?.access_token) {
        // Decodificar o token para extrair app_metadata.tenant_roles
        const decoded = decodeJWT(session.access_token)
        const tenantRoles = decoded?.app_metadata?.tenant_roles || {}
        // Obter tenant atual do store
        let tenantSlug = null
        try {
          // Importação dinâmica para evitar ciclo
          const { useTenantStore } = await import('~/stores/tenant')
          tenantSlug = useTenantStore().tenantId
        } catch {}
        let role = null
        if (tenantSlug && tenantRoles[tenantSlug]) {
          role = tenantRoles[tenantSlug]
        } else {
          // Fallback: pega o primeiro role disponível
          const firstTenant = Object.keys(tenantRoles)[0]
          if (firstTenant) {
            role = tenantRoles[firstTenant]
          }
        }
        userRole.value = role
        return
      }
      // Fallback: se não encontrar role no token, busca da tabela user_roles
      const { data, error } = await client
        .from('user_roles')
        .select('role')
        .eq('user_id', user.value.id)
        .single()
        .throwOnError()

      if (error) {
        throw error
      }

      userRole.value = data?.role || null
    }
    catch (error) {
      console.error('Erro ao buscar papel do usuário:', error)
      userRole.value = null
    }
  }

  // Inicializar o papel do usuário
  onMounted(() => {
    updateUserRole()
  })

  // Monitorar mudanças no usuário
  watch(user, (newUser) => {
    if (newUser) {
      updateUserRole()
    }
    else {
      userRole.value = null
    }
  })

  // Configurar realtime para monitorar mudanças na tabela users
  onMounted(() => {
    const channel = client
      .channel('users_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
        },
        (payload: any) => {
          // Se a mudança for no usuário atual, atualize o papel
          if (payload.new?.id === user.value?.id) {
            updateUserRole()
          }
        },
      )
      .subscribe()

    // Limpar subscription quando o componente for desmontado
    onUnmounted(() => {
      channel.unsubscribe()
    })
  })

  // Verificar se o usuário tem um papel específico
  const hasRole = (role: string) => {
    return userRole.value === role
  }

  // Verificar se o usuário tem um dos papéis especificados
  const hasAnyRole = (roles: string[]) => {
    return roles.includes(userRole.value || '')
  }

  // Função para login
  const login = async (email: string, password: string) => {
    loading.value = true
    error.value = null

    try {
      const { data, error: authError } = await client.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        error.value = authError.message
        return { success: false, error: authError.message }
      }

      // Após login bem-sucedido, verifique o role do usuário
      await updateUserRole()

      const { data: userData } = await client.auth.getUser()
      const tenantIdFromJwt = userData?.user?.user_metadata?.tenant_id
      const { setTenantId } = useTenant()
      if (tenantIdFromJwt) {
        setTenantId(tenantIdFromJwt)
        // Se necessário, disparar fetchArticles()
      }

      return { success: true, data }
    }
    catch (err: any) {
      error.value = err.message
      return { success: false, error: err.message }
    }
    finally {
      loading.value = false
    }
  }

  // Função para logout
  const logout = async () => {
    loading.value = true
    error.value = null
    userRole.value = null

    try {
      const { error: logoutError } = await client.auth.signOut()

      if (logoutError) {
        error.value = logoutError.message
        return { success: false, error: logoutError.message }
      }

      router.push('/login')
      return { success: true }
    }
    catch (err: any) {
      error.value = err.message
      return { success: false, error: err.message }
    }
    finally {
      loading.value = false
    }
  }

  // Função para verificar se o usuário está autenticado
  const isAuthenticated = computed(() => !!user.value)

  // Função para obter o usuário atual
  const currentUser = computed(() => user.value)

  // Função para obter o role atual
  const currentRole = computed(() => userRole.value)

  // Função para verificar a sessão atual
  const checkSession = async () => {
    const { data } = await client.auth.getSession()
    if (data.session?.access_token) {
      await updateUserRole()
    }
    return !!data.session
  }

  return {
    login,
    logout,
    isAuthenticated,
    currentUser,
    currentRole,
    checkSession,
    loading,
    error,
    hasRole,
    hasAnyRole,
    updateUserRole,
  }
}
