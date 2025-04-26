export function useAuth() {
  const client = useSupabaseClient()
  const user = useSupabaseUser()
  const router = useRouter()
  const loading = ref(false)
  const error = ref<string | null>(null)
  const userRole = ref<string | null>(null)

  // Função para decodificar JWT
  const decodeJWT = (token: string) => {
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

  // Função para obter o role do usuário do token JWT
  const getUserRole = async (token?: string) => {
    try {
      if (!token) {
        const { data } = await client.auth.getSession()
        token = data.session?.access_token
      }

      if (token) {
        const decoded = decodeJWT(token)
        if (decoded && 'user_role' in decoded) {
          userRole.value = decoded.user_role
          return decoded.user_role
        }
      }

      userRole.value = null
      return null
    }
    catch (err) {
      console.error('Erro ao obter role do usuário:', err)
      userRole.value = null
      return null
    }
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
      if (data?.session?.access_token) {
        await getUserRole(data.session.access_token)
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

  // Função para verificar se o usuário tem uma determinada role
  const hasRole = (role: string | string[]) => {
    if (!userRole.value) {
      return false
    }

    const roles = Array.isArray(role) ? role : [role]
    return roles.includes(userRole.value)
  }

  // Verificar o role do usuário ao inicializar (e forçar refresh para captar mudanças)
  onMounted(async () => {
    // Tentar renovar a sessão e obter JWT atualizado
    const { data: refreshData, error: refreshError } = await client.auth.refreshSession()
    if (refreshError) {
      console.error('Erro ao renovar sessão:', refreshError.message)
    }

    const token = refreshData.session?.access_token
    if (token) {
      await getUserRole(token)
    }

    // Assinar mudanças na tabela users para detectar troca de role
    if (user.value?.id) {
      const channel = client
        .channel(`user-role-update-${user.value.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'users',
            filter: `id=eq.${user.value.id}`,
          },
          async () => {
            // forçar nova sessão e atualizar role
            const { data: newSessionData } = await client.auth.refreshSession()
            const newToken = newSessionData.session?.access_token
            if (newToken) {
              await getUserRole(newToken)
            }
          },
        )
      await channel.subscribe()
    }
  })

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
      await getUserRole(data.session.access_token)
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
    getUserRole,
  }
}
