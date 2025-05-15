import { useSupabaseClient } from '#imports'
import { ref } from 'vue'
import type { Category } from '~/types/ecommerce'

export function useCategories() {
  const supabase = useSupabaseClient()
  const categories = ref<Category[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  const fetchCategories = async () => {
    try {
      loading.value = true
      error.value = null
      
      const { data, error: err } = await supabase
        .from('ecommerce_categories')
        .select('*')
        .order('name')
      
      if (err) throw err
      
      categories.value = data || []
      return categories.value
    } catch (err: any) {
      console.error('Error fetching categories:', err)
      error.value = err.message || 'Erro ao buscar categorias'
      return []
    } finally {
      loading.value = false
    }
  }
  
  const getCategoryById = async (id: string) => {
    try {
      loading.value = true
      error.value = null
      
      const { data, error: err } = await supabase
        .from('ecommerce_categories')
        .select('*')
        .eq('id', id)
        .single()
      
      if (err) throw err
      
      return data
    } catch (err: any) {
      console.error('Error fetching category:', err)
      error.value = err.message || 'Erro ao buscar a categoria'
      return null
    } finally {
      loading.value = false
    }
  }
  
  const createCategory = async (categoryData: Pick<Category, 'name' | 'description' | 'parent_id'>) => {
    try {
      loading.value = true
      error.value = null
      
      const { data, error: err } = await supabase
        .from('ecommerce_categories')
        .insert(categoryData)
        .select()
        .single()
      
      if (err) throw err
      
      // Atualiza a lista de categorias
      await fetchCategories()
      
      return data
    } catch (err: any) {
      console.error('Error creating category:', err)
      error.value = err.message || 'Erro ao criar a categoria'
      return null
    } finally {
      loading.value = false
    }
  }
  
  const updateCategory = async (id: string, categoryData: Partial<Pick<Category, 'name' | 'description' | 'parent_id'>>) => {
    try {
      loading.value = true
      error.value = null
      
      const { data, error: err } = await supabase
        .from('ecommerce_categories')
        .update(categoryData)
        .eq('id', id)
        .select()
        .single()
      
      if (err) throw err
      
      // Atualiza a lista de categorias
      await fetchCategories()
      
      return data
    } catch (err: any) {
      console.error('Error updating category:', err)
      error.value = err.message || 'Erro ao atualizar a categoria'
      return null
    } finally {
      loading.value = false
    }
  }
  
  const deleteCategory = async (id: string) => {
    try {
      loading.value = true
      error.value = null
      
      const { error: err } = await supabase
        .from('ecommerce_categories')
        .delete()
        .eq('id', id)
      
      if (err) throw err
      
      // Atualiza a lista de categorias
      await fetchCategories()
      
      return true
    } catch (err: any) {
      console.error('Error deleting category:', err)
      error.value = err.message || 'Erro ao excluir a categoria'
      return false
    } finally {
      loading.value = false
    }
  }
  
  return {
    categories,
    loading,
    error,
    fetchCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory
  }
}