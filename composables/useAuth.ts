import { useSupabaseClient, useSupabaseUser } from '#imports'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const client = useSupabaseClient()
  const user = useSupabaseUser()
  const router = useRouter()
  const loading = ref(false)
  const error = ref<string | null>(null)
  const userRole = ref<string | null>(null)

  // Função para atualizar o papel do usuário
  const updateUserRole = async () => {
    if (!user.value) {
      userRole.value = null
      return
    }

    try {
      // Forçar uma nova consulta sem cache
      const { data, error } = await client
        .from('users')
        .select('role')
        .eq('id', user.value.id)
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
