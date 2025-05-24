import { ref, onMounted } from 'vue'
import { useSupabaseClient } from '#imports'
import { useAuth } from '~/composables/useAuth'
import { useTenant } from '~/composables/useTenant'

export function useClientArticles() {
  const client = useSupabaseClient()
  const { currentUser } = useAuth()
  const { tenantId } = useTenant()
  const articles = ref<any[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchClientArticles = async () => {
    loading.value = true
    error.value = null
    if (!tenantId.value) {
      articles.value = []
      loading.value = false
      return
    }
    // Busca apenas artigos do tenant do usuário autenticado
    const { data, error: fetchError } = await client
      .from('articles')
      .select('*')
      .eq('tenant_id', tenantId.value)
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