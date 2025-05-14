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
    
    // Remover tags do payload antes de inserir o artigo
    const tags = payload.tags
    delete payload.tags
    
    const { data: newArticle, error: createError } = await client
      .from('article')
      .insert([payload])
      .select()

    if (createError) {
      loading.value = false
      error.value = createError.message
      return false
    }

    // Adicionar relacionamentos de tags se existirem
    if (tags && tags.length > 0 && newArticle && newArticle.length > 0) {
      const articleId = newArticle[0].id
      const tagRelationships = tags.map((tagId: string) => ({
        article_id: articleId,
        tag_id: tagId,
      }))

      const { error: tagRelationError } = await client
        .from('article_tags')
        .insert(tagRelationships)

      if (tagRelationError) {
        error.value = `Artigo criado, mas ocorreu um erro ao relacionar as tags: ${tagRelationError.message}`
      }
    }

    loading.value = false
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

    // Remover tags do payload antes de atualizar o artigo
    const tags = payload.tags
    delete payload.tags

    const { error: updateError } = await client
      .from('article')
      .update(payload)
      .eq('id', id)

    if (updateError) {
      loading.value = false
      error.value = updateError.message
      return false
    }

    // Atualizar relacionamentos de tags se existirem
    if (tags && Array.isArray(tags)) {
      // Primeiro remover todos os relacionamentos existentes
      const { error: deleteRelationError } = await client
        .from('article_tags')
        .delete()
        .eq('article_id', id)

      if (deleteRelationError) {
        loading.value = false
        error.value = `Artigo atualizado, mas ocorreu um erro ao atualizar as tags: ${deleteRelationError.message}`
        return false
      }

      // Adicionar novos relacionamentos
      if (tags.length > 0) {
        const tagRelationships = tags.map((tagId: string) => ({
          article_id: id,
          tag_id: tagId,
        }))

        const { error: tagRelationError } = await client
          .from('article_tags')
          .insert(tagRelationships)

        if (tagRelationError) {
          loading.value = false
          error.value = `Artigo atualizado, mas ocorreu um erro ao relacionar as tags: ${tagRelationError.message}`
          return false
        }
      }
    }

    loading.value = false
    return true
  }

  // Deletar artigo
  const deleteArticle = async (id: string) => {
    loading.value = true
    error.value = null

    // Primeiro remover relacionamentos de tags
    const { error: deleteTagsError } = await client
      .from('article_tags')
      .delete()
      .eq('article_id', id)

    if (deleteTagsError) {
      loading.value = false
      error.value = deleteTagsError.message
      return false
    }

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

  const checkCategoryExists = async (title: string, excludeId?: string) => {
    try {
      if (!title?.trim()) {
        error.value = 'O título da categoria é obrigatório'
        return true
      }

      const normalizedTitle = title.trim().toLowerCase()
      
      const { data, error: checkError } = await client
        .from('article_category')
        .select('id, title')
        .ilike('title', normalizedTitle)

      if (checkError) {
        console.error('Erro ao verificar categoria:', checkError)
        error.value = 'Erro ao verificar duplicidade de categoria'
        return false
      }

      if (!data || data.length === 0) {
        return false
      }

      // Se estiver editando, verifica se o título encontrado pertence ao mesmo registro
      if (excludeId) {
        return data.some(cat => cat.id !== excludeId && cat.title.toLowerCase() === normalizedTitle)
      }

      return true
    } catch (err) {
      console.error('Erro ao verificar categoria:', err)
      error.value = 'Erro ao verificar duplicidade de categoria'
      return false
    }
  }

  const createCategory = async (category: any) => {
    try {
      loading.value = true
      error.value = null

      const normalizedTitle = category.title?.trim()
      if (!normalizedTitle) {
        error.value = 'O título da categoria é obrigatório'
        return false
      }

      // Verificar se já existe uma categoria com o mesmo título
      const exists = await checkCategoryExists(normalizedTitle)
      if (exists) {
        error.value = 'Já existe uma categoria com este nome'
        return false
      }

      const { data, error: createError } = await client
        .from('article_category')
        .insert([{ ...category, title: normalizedTitle }])
        .select()

      if (createError) {
        console.error('Erro ao criar categoria:', createError)
        error.value = 'Erro ao criar categoria'
        return false
      }

      return data && data.length > 0
    } catch (err) {
      console.error('Erro ao criar categoria:', err)
      error.value = 'Erro ao criar categoria'
      return false
    } finally {
      loading.value = false
    }
  }

  const updateCategory = async (id: string, updates: any) => {
    loading.value = true
    error.value = null

    // Verificar se já existe outra categoria com o mesmo título
    const exists = await checkCategoryExists(updates.title, id)
    if (exists) {
      loading.value = false
      error.value = 'Já existe uma categoria com este nome'
      return false
    }

    const { error: updateError } = await client
      .from('article_category')
      .update(updates)
      .eq('id', id)
    loading.value = false
    if (updateError) {
      error.value = updateError.message
      return false
    }
    return true
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
      .from('article_tag')
      .select('*')
    tags.value = data || []
    error.value = fetchError?.message || null
    loading.value = false
  }

  const checkTagExists = async (title: string, excludeId?: string) => {
    try {
      if (!title?.trim()) {
        error.value = 'O título da tag é obrigatório'
        return true
      }

      const normalizedTitle = title.trim().toLowerCase()
      
      const { data, error: checkError } = await client
        .from('article_tag')
        .select('id, title')
        .ilike('title', normalizedTitle)

      if (checkError) {
        console.error('Erro ao verificar tag:', checkError)
        error.value = 'Erro ao verificar duplicidade de tag'
        return false
      }

      if (!data || data.length === 0) {
        return false
      }

      // Se estiver editando, verifica se o título encontrado pertence ao mesmo registro
      if (excludeId) {
        return data.some(tag => tag.id !== excludeId && tag.title.toLowerCase() === normalizedTitle)
      }

      return true
    } catch (err) {
      console.error('Erro ao verificar tag:', err)
      error.value = 'Erro ao verificar duplicidade de tag'
      return false
    }
  }

  const createTag = async (tag: any) => {
    try {
      loading.value = true
      error.value = null

      const normalizedTitle = tag.title?.trim()
      if (!normalizedTitle) {
        error.value = 'O título da tag é obrigatório'
        return false
      }

      // Verificar se já existe uma tag com o mesmo título
      const exists = await checkTagExists(normalizedTitle)
      if (exists) {
        error.value = 'Já existe uma tag com este nome'
        return false
      }

      const { data, error: createError } = await client
        .from('article_tag')
        .insert([{ ...tag, title: normalizedTitle }])
        .select()

      if (createError) {
        console.error('Erro ao criar tag:', createError)
        error.value = 'Erro ao criar tag'
        return false
      }

      return data && data.length > 0
    } catch (err) {
      console.error('Erro ao criar tag:', err)
      error.value = 'Erro ao criar tag'
      return false
    } finally {
      loading.value = false
    }
  }

  const updateTag = async (id: string, updates: any) => {
    loading.value = true
    error.value = null

    // Verificar se já existe outra tag com o mesmo título
    const exists = await checkTagExists(updates.title, id)
    if (exists) {
      loading.value = false
      error.value = 'Já existe uma tag com este nome'
      return false
    }

    const { error: updateError } = await client
      .from('article_tag')
      .update(updates)
      .eq('id', id)
    loading.value = false
    if (updateError) {
      error.value = updateError.message
      return false
    }
    return true
  }

  const deleteTag = async (id: string) => {
    loading.value = true
    error.value = null
    const { error: deleteError } = await client
      .from('article_tag')
      .delete()
      .eq('id', id)
    loading.value = false
    if (deleteError) {
      error.value = deleteError.message
      return false
    }
    return true
  }

  // Relacionamentos de tags
  const fetchArticleTags = async (articleId: string) => {
    loading.value = true
    error.value = null
    const { data, error: fetchError } = await client
      .from('article_tags')
      .select('tag_id')
      .eq('article_id', articleId)
    loading.value = false
    if (fetchError) {
      error.value = fetchError.message
      return []
    }
    return data.map((item: any) => item.tag_id)
  }

  const addTagToArticle = async (articleId: string, tagId: string) => {
    loading.value = true
    error.value = null
    const { error: createError } = await client
      .from('article_tags')
      .insert([{ article_id: articleId, tag_id: tagId }])
    loading.value = false
    if (createError) {
      error.value = createError.message
      return false
    }
    return true
  }

  const removeTagFromArticle = async (articleId: string, tagId: string) => {
    loading.value = true
    error.value = null
    const { error: deleteError } = await client
      .from('article_tags')
      .delete()
      .eq('article_id', articleId)
      .eq('tag_id', tagId)
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
    fetchArticleTags,
    addTagToArticle,
    removeTagFromArticle,
    loading,
    error,
  }
}
