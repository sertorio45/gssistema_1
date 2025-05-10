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

    // Log para debug
    console.log('[DEBUG] Updates:', payload)
    console.log('[DEBUG] Tags a serem atualizadas:', tags)

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
      console.log('[DEBUG] Atualizando relacionamentos de tags')

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
        console.log('[DEBUG] Adicionando novos relacionamentos:', tags)
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
      .from('article_tag')
      .select('*')
      .order('title')
    tags.value = data || []
    error.value = fetchError?.message || null
    loading.value = false
  }

  const createTag = async (tag: any) => {
    loading.value = true
    error.value = null
    // Verificar se a tag já existe
    const { data: existingTags } = await client
      .from('article_tag')
      .select('id')
      .eq('title', tag.title.trim())
      .limit(1)

    if (existingTags && existingTags.length > 0) {
      loading.value = false
      return existingTags[0] // Retornar a tag existente
    }

    // Criar nova tag se não existir
    const { data, error: createError } = await client
      .from('article_tag')
      .insert([{
        title: tag.title.trim(),
        status: tag.status || 'published',
      }])
      .select()

    loading.value = false
    if (createError) {
      error.value = createError.message
      return null
    }
    return data ? data[0] : null
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

  // Relacionamentos entre artigos e tags
  const fetchArticleTags = async (articleId: string) => {
    loading.value = true
    error.value = null

    // Primeiro, obtenha todas as relações artigo-tag para o artigo específico
    const { data: relations, error: relationsError } = await client
      .from('article_tags')
      .select('tag_id')
      .eq('article_id', articleId)

    if (relationsError) {
      loading.value = false
      error.value = relationsError.message
      return []
    }

    // Se não houver relações, retorne um array vazio
    if (!relations || relations.length === 0) {
      loading.value = false
      return []
    }

    // Extraia os IDs das tags
    const tagIds = relations.map(relation => relation.tag_id)

    // Agora busque os detalhes de todas as tags relacionadas
    const { data: tags, error: tagsError } = await client
      .from('article_tag')
      .select('id, title')
      .in('id', tagIds)

    loading.value = false

    if (tagsError) {
      error.value = tagsError.message
      return []
    }

    // Retorne as tags formatadas para uso no componente
    return tags ? tags.map(tag => ({
      id: tag.id,
      title: tag.title,
      value: tag.title, // Adicionar valor para exibição no componente
    })) : []
  }

  const addTagToArticle = async (articleId: string, tagId: string) => {
    loading.value = true
    error.value = null
    const { error: relationError } = await client
      .from('article_tags')
      .insert([{
        article_id: articleId,
        tag_id: tagId,
      }])

    loading.value = false
    if (relationError) {
      error.value = relationError.message
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
    deleteTag,
    fetchArticleTags,
    addTagToArticle,
    removeTagFromArticle,
    loading,
    error,
  }
}
