import { useSupabaseClient } from '#imports'
import { ref } from 'vue'

export function useArticles() {
  const client = useSupabaseClient()
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Listar artigos
  const articles = ref<any[]>([])
  const fetchArticles = async (tenantId?: string) => {
    loading.value = true
    error.value = null
    let query = client.from('articles').select('*')
    if (tenantId) {
      query = query.eq('tenant_id', tenantId)
    }
    const { data, error: fetchError } = await query
    articles.value = data || []
    error.value = fetchError?.message || null
    loading.value = false
  }

  // Buscar artigo por ID
  const fetchArticleById = async (id: string) => {
    loading.value = true
    error.value = null
    const { data, error: fetchError } = await client
      .from('articles')
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
    
    // Remover tags do payload antes de inserir o artigo
    const tags = payload.tags
    delete payload.tags
    
    const { data: newArticle, error: createError } = await client
      .from('articles')
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
        .from('article_tag_relations')
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
    
    // Remover tags do payload antes de atualizar o artigo
    const tags = payload.tags
    delete payload.tags

    const { error: updateError } = await client
      .from('articles')
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
        .from('article_tag_relations')
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
          .from('article_tag_relations')
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
      .from('article_tag_relations')
      .delete()
      .eq('article_id', id)

    if (deleteTagsError) {
      loading.value = false
      error.value = deleteTagsError.message
      return false
    }

    const { error: deleteError } = await client
      .from('articles')
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
    
    // Mapeamento para compatibilidade com interfaces antigas
    if (data && Array.isArray(data)) {
      categories.value = data.map(cat => ({
        ...cat,
        title: cat.name, // Para compatibilidade com componentes que usam title
        status: cat.is_active ? 'published' : 'draft' // Para compatibilidade
      }))
    } else {
      categories.value = []
    }
    
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
        .select('id, name')
        .ilike('name', normalizedTitle)

      if (checkError) {
        error.value = checkError.message
        return false
      }

      if (data && data.length > 0) {
        // Se fornecido um ID para excluir (em caso de edição)
        if (excludeId) {
          return data.some(c => c.id !== excludeId)
        }
        return true
      }
      return false
    } catch (e: any) {
      error.value = e.message
      return false
    }
  }

  const createCategory = async (category: any) => {
    loading.value = true
    error.value = null
    
    const categoryData = { ...category }
    
    // Compatibilidade: Se receber title, mapear para name
    if (categoryData.title && !categoryData.name) {
      categoryData.name = categoryData.title
      delete categoryData.title
    }
    
    // Compatibilidade: Se receber status, mapear para is_active
    if (categoryData.status && categoryData.is_active === undefined) {
      categoryData.is_active = categoryData.status === 'published'
      delete categoryData.status
    }
    
    // Garantir que slug existe
    if (!categoryData.slug && categoryData.name) {
      categoryData.slug = categoryData.name
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036F]/g, '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/-{2,}/g, '-')
    }
    
    // Verificar se já existe uma categoria com o mesmo nome
    const exists = await checkCategoryExists(categoryData.name)
    if (exists) {
      loading.value = false
      error.value = 'Já existe uma categoria com este nome'
      return false
    }
    
    const { error: createError } = await client
      .from('article_category')
      .insert([categoryData])
    loading.value = false
    
    if (createError) {
      error.value = createError.message
      return false
    }
    
    return true
  }

  const updateCategory = async (id: string, updates: any) => {
    loading.value = true
    error.value = null
    
    const updateData = { ...updates }
    
    // Compatibilidade: Se receber title, mapear para name
    if (updateData.title && !updateData.name) {
      updateData.name = updateData.title
      delete updateData.title
    }
    
    // Compatibilidade: Se receber status, mapear para is_active
    if (updateData.status && updateData.is_active === undefined) {
      updateData.is_active = updateData.status === 'published'
      delete updateData.status
    }
    
    // Garantir que slug existe
    if (!updateData.slug && updateData.name) {
      updateData.slug = updateData.name
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036F]/g, '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/-{2,}/g, '-')
    }
    
    // Verificar se já existe uma categoria com o mesmo nome (excluindo a atual)
    if (updateData.name) {
      const exists = await checkCategoryExists(updateData.name, id)
      if (exists) {
        loading.value = false
        error.value = 'Já existe uma categoria com este nome'
        return false
      }
    }
    
    const { error: updateError } = await client
      .from('article_category')
      .update(updateData)
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
    
    // Primeiro verificar se há artigos usando esta categoria
    const { data: usageData, error: usageError } = await client
      .from('articles')
      .select('id')
      .eq('category_id', id)
    
    if (usageError) {
      loading.value = false
      error.value = usageError.message
      return false
    }
    
    if (usageData && usageData.length > 0) {
      loading.value = false
      error.value = 'Esta categoria está sendo usada por artigos e não pode ser excluída'
      return false
    }
    
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
        error.value = 'O nome da tag é obrigatório'
        return true
      }

      const normalizedTitle = title.trim().toLowerCase()
      
      const { data, error: checkError } = await client
        .from('article_tag')
        .select('id, name')
        .ilike('name', normalizedTitle)

      if (checkError) {
        error.value = checkError.message
        return false
      }

      if (data && data.length > 0) {
        // Se fornecido um ID para excluir (em caso de edição)
        if (excludeId) {
          return data.some(t => t.id !== excludeId)
        }
        return true
      }
      return false
    } catch (e: any) {
      error.value = e.message
      return false
    }
  }

  const createTag = async (tag: any) => {
    loading.value = true
    error.value = null
    
    // Verificar se já existe uma tag com o mesmo nome
    const exists = await checkTagExists(tag.name)
    if (exists) {
      loading.value = false
      error.value = 'Já existe uma tag com este nome'
      return false
    }
    
    const { error: createError } = await client
      .from('article_tag')
      .insert([tag])
    loading.value = false
    
    if (createError) {
      error.value = createError.message
      return false
    }
    
    return true
  }

  const updateTag = async (id: string, updates: any) => {
    loading.value = true
    error.value = null
    
    // Verificar se já existe uma tag com o mesmo nome (excluindo a atual)
    if (updates.name) {
      const exists = await checkTagExists(updates.name, id)
      if (exists) {
        loading.value = false
        error.value = 'Já existe uma tag com este nome'
        return false
      }
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
    
    // Primeiro verificar se há artigos usando esta tag
    const { data: usageData, error: usageError } = await client
      .from('article_tag_relations')
      .select('id')
      .eq('tag_id', id)
    
    if (usageError) {
      loading.value = false
      error.value = usageError.message
      return false
    }
    
    if (usageData && usageData.length > 0) {
      loading.value = false
      error.value = 'Esta tag está sendo usada por artigos e não pode ser excluída'
      return false
    }
    
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

  // Relacionamentos de tags com artigos
  const fetchArticleTags = async (articleId: string) => {
    const { data, error: fetchError } = await client
      .from('article_tag_relations')
      .select('tag_id')
      .eq('article_id', articleId)
    
    if (fetchError) {
      error.value = fetchError.message
      return []
    }
    
    return data?.map(relation => relation.tag_id) || []
  }

  const addTagToArticle = async (articleId: string, tagId: string) => {
    const { error: addError } = await client
      .from('article_tag_relations')
      .insert([{ article_id: articleId, tag_id: tagId }])
    
    if (addError) {
      error.value = addError.message
      return false
    }
    
    return true
  }

  const removeTagFromArticle = async (articleId: string, tagId: string) => {
    const { error: removeError } = await client
      .from('article_tag_relations')
      .delete()
      .eq('article_id', articleId)
      .eq('tag_id', tagId)
    
    if (removeError) {
      error.value = removeError.message
      return false
    }
    
    return true
  }

  return {
    // Estado
    loading,
    error,
    articles,
    categories,
    tags,
    
    // Artigos
    fetchArticles,
    fetchArticleById,
    createArticle,
    updateArticle,
    deleteArticle,
    
    // Categorias
    fetchCategories,
    checkCategoryExists,
    createCategory,
    updateCategory,
    deleteCategory,
    
    // Tags
    fetchTags,
    checkTagExists,
    createTag,
    updateTag,
    deleteTag,
    
    // Relacionamentos
    fetchArticleTags,
    addTagToArticle,
    removeTagFromArticle
  }
}
