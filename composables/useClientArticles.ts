import { ref, onMounted } from 'vue'
import { useSupabaseClient } from '#imports'
import { useAuth } from '~/composables/useAuth'

export function useClientArticles() {
  const client = useSupabaseClient()
  const { currentUser } = useAuth()
  const articles = ref<any[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchClientArticles = async () => {
    loading.value = true
    error.value = null
    // Busca todos os artigos do tenant do usuário autenticado (RLS garante segurança)
    const { data, error: fetchError } = await client
      .from('articles')
      .select('*')
    articles.value = data || []
    error.value = fetchError?.message || null
    loading.value = false
  }

  onMounted(() => {
    fetchClientArticles()
  })

  return {
    articles,
    loading,
    error,
    fetchClientArticles,
  }
} 