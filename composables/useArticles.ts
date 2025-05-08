import { useSupabaseClient } from '#imports'

export function useArticles() {
  const client = useSupabaseClient()
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Listar artigos
  const articles = ref<any[]>([])
  const fetchArticles = async () => {
    loading.value = true
    error.value = null
    const { data, error: fetchError } = await client
      .from('article')
      .select('*')
      // .eq('tenant_id', user.value?.tenant_id) // se usar multi-tenant
    articles.value = data || []
    error.value = fetchError?.message || null
    loading.value = false
  }

  // Buscar artigo por ID
  const fetchArticleById = async (id: string) => {
    loading.value = true
    error.value = null
    const { data, error: fetchError } = await client
      .from('article')
      .select('*')
      .eq('id', id)
      .single()
    loading.value = false
    if (fetchError) {
      error.value = fetchError.message
      return null
    }
    return data
  }

  // Criar artigo
  const createArticle = async (article: any) => {
    loading.value = true
    error.value = null
    const payload = { ...article }
    if (payload.category) {
      payload.category_id = payload.category
      delete payload.category
    }
    if (!payload.category_id || payload.category_id === '') {
      loading.value = false
      error.value = 'Categoria é obrigatória.'
      return false
    }
    const { error: createError } = await client
      .from('article')
      .insert([payload])
    loading.value = false
    if (createError) {
      error.value = createError.message
      return false
    }
    return true
  }

  // Atualizar artigo
  const updateArticle = async (id: string, updates: any) => {
    loading.value = true
    error.value = null
    const payload = { ...updates }
    if (payload.category) {
      payload.category_id = payload.category
      delete payload.category
    }
    if (!payload.category_id || payload.category_id === '') {
      loading.value = false
      error.value = 'Categoria é obrigatória.'
      return false
    }
    const { error: updateError } = await client
      .from('article')
      .update(payload)
      .eq('id', id)
    loading.value = false
    if (updateError) {
      error.value = updateError.message
      return false
    }
    return true
  }

  // Deletar artigo
  const deleteArticle = async (id: string) => {
    loading.value = true
    error.value = null
    const { error: deleteError } = await client
      .from('article')
      .delete()
      .eq('id', id)
    loading.value = false
    if (deleteError) {
      error.value = deleteError.message
      return false
    }
    return true
  }

  // Categorias
  const categories = ref<any[]>([])
  const fetchCategories = async () => {
    loading.value = true
    error.value = null
    const { data, error: fetchError } = await client
      .from('article_category')
      .select('*')
    categories.value = data || []
    error.value = fetchError?.message || null
    loading.value = false
  }

  const createCategory = async (category: any) => {
    loading.value = true
    error.value = null
    const { data, error: createError } = await client
      .from('article_category')
      .insert([category])
    loading.value = false
    if (createError) {
      error.value = createError.message
      return null
    }
    return data
  }

  const updateCategory = async (id: string, updates: any) => {
    loading.value = true
    error.value = null
    const { data, error: updateError } = await client
      .from('article_category')
      .update(updates)
      .eq('id', id)
    loading.value = false
    if (updateError) {
      error.value = updateError.message
      return null
    }
    return data
  }

  const deleteCategory = async (id: string) => {
    loading.value = true
    error.value = null
    const { error: deleteError } = await client
      .from('article_category')
      .delete()
      .eq('id', id)
    loading.value = false
    if (deleteError) {
      error.value = deleteError.message
      return false
    }
    return true
  }

  // Tags
  const tags = ref<any[]>([])
  const fetchTags = async () => {
    loading.value = true
    error.value = null
    const { data, error: fetchError } = await client
      .from('article_tags')
      .select('*')
    tags.value = data || []
    error.value = fetchError?.message || null
    loading.value = false
  }

  const createTag = async (tag: any) => {
    loading.value = true
    error.value = null
    const { data, error: createError } = await client
      .from('article_tags')
      .insert([tag])
    loading.value = false
    if (createError) {
      error.value = createError.message
      return null
    }
    return data
  }

  const updateTag = async (id: string, updates: any) => {
    loading.value = true
    error.value = null
    const { data, error: updateError } = await client
      .from('article_tags')
      .update(updates)
      .eq('id', id)
    loading.value = false
    if (updateError) {
      error.value = updateError.message
      return null
    }
    return data
  }

  const deleteTag = async (id: string) => {
    loading.value = true
    error.value = null
    const { error: deleteError } = await client
      .from('article_tags')
      .delete()
      .eq('id', id)
    loading.value = false
    if (deleteError) {
      error.value = deleteError.message
      return false
    }
    return true
  }

  return {
    articles,
    fetchArticles,
    fetchArticleById,
    createArticle,
    updateArticle,
    deleteArticle,
    categories,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    tags,
    fetchTags,
    createTag,
    updateTag,
    deleteTag,
    loading,
    error,
  }
} 