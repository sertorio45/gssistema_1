import { useSupabaseClient } from '#imports'
import { ref, computed } from 'vue'
import type { Product, ProductFilters, ProductFormData, ProductImage } from '~/types/ecommerce'

export function useProducts() {
  const supabase = useSupabaseClient()
  const products = ref<Product[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const totalProducts = ref(0)
  const currentPage = ref(1)
  const pageSize = ref(10)
  
  const fetchProducts = async (filters: ProductFilters = {}) => {
    try {
      loading.value = true
      error.value = null
      
      let query = supabase
        .from('ecommerce_products')
        .select(`
          *,
          category:ecommerce_categories(*),
          variants:ecommerce_variants(*),
          images:ecommerce_images(*)
        `, { count: 'exact' })
      
      // Aplicar filtros
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,sku.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
      }
      
      if (filters.category_id) {
        query = query.eq('category_id', filters.category_id)
      }
      
      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      
      if (filters.minPrice !== undefined) {
        query = query.gte('price', filters.minPrice)
      }
      
      if (filters.maxPrice !== undefined) {
        query = query.lte('price', filters.maxPrice)
      }
      
      // Paginação
      const pageIndex = (filters.page || currentPage.value) - 1
      const limit = filters.pageSize || pageSize.value
      
      // Ordenação
      const sort = filters.sort || 'created_at'
      const order = filters.order || 'desc'
      
      const { data, count, error: err } = await query
        .order(sort, { ascending: order === 'asc' })
        .range(pageIndex * limit, (pageIndex * limit) + limit - 1)
      
      if (err) throw err
      
      products.value = data || []
      totalProducts.value = count || 0
      
      // Processar imagens - separar thumb e gallery
      products.value = products.value.map(product => {
        const images = product.images || []
        const thumb = images.find((img: ProductImage) => img.type === 'thumb')
        const gallery = images.filter((img: ProductImage) => img.type === 'gallery')
        
        return {
          ...product,
          thumb,
          gallery,
          // Adicionar URL completas para imagens
          images: images.map((img: ProductImage) => ({
            ...img,
            url: `${process.env.SUPABASE_URL}/storage/v1/object/public/ecommerce/${img.path}`
          }))
        }
      })
      
      return { products: products.value, count: totalProducts.value }
    } catch (err: any) {
      console.error('Error fetching products:', err)
      error.value = err.message || 'Erro ao buscar produtos'
      return { products: [], count: 0 }
    } finally {
      loading.value = false
    }
  }
  
  const getProductById = async (id: string) => {
    try {
      loading.value = true
      error.value = null
      
      const { data, error: err } = await supabase
        .from('ecommerce_products')
        .select(`
          *,
          category:ecommerce_categories(*),
          variants:ecommerce_variants(*),
          images:ecommerce_images(*)
        `)
        .eq('id', id)
        .single()
      
      if (err) throw err
      
      if (data) {
        const images = data.images || []
        const thumb = images.find((img: ProductImage) => img.type === 'thumb')
        const gallery = images.filter((img: ProductImage) => img.type === 'gallery')
        
        return {
          ...data,
          thumb,
          gallery,
          // Adicionar URL completas para imagens
          images: images.map((img: ProductImage) => ({
            ...img,
            url: `${process.env.SUPABASE_URL}/storage/v1/object/public/ecommerce/${img.path}`
          }))
        }
      }
      
      return null
    } catch (err: any) {
      console.error('Error fetching product:', err)
      error.value = err.message || 'Erro ao buscar o produto'
      return null
    } finally {
      loading.value = false
    }
  }
  
  const createProduct = async (productData: ProductFormData) => {
    try {
      loading.value = true
      error.value = null
      
      const { data, error: err } = await supabase
        .from('ecommerce_products')
        .insert(productData)
        .select()
        .single()
      
      if (err) throw err
      
      return data
    } catch (err: any) {
      console.error('Error creating product:', err)
      error.value = err.message || 'Erro ao criar o produto'
      return null
    } finally {
      loading.value = false
    }
  }
  
  const updateProduct = async (id: string, productData: Partial<ProductFormData>) => {
    try {
      loading.value = true
      error.value = null
      
      const { data, error: err } = await supabase
        .from('ecommerce_products')
        .update(productData)
        .eq('id', id)
        .select()
        .single()
      
      if (err) throw err
      
      return data
    } catch (err: any) {
      console.error('Error updating product:', err)
      error.value = err.message || 'Erro ao atualizar o produto'
      return null
    } finally {
      loading.value = false
    }
  }
  
  const deleteProduct = async (id: string) => {
    try {
      loading.value = true
      error.value = null
      
      const { error: err } = await supabase
        .from('ecommerce_products')
        .delete()
        .eq('id', id)
      
      if (err) throw err
      
      return true
    } catch (err: any) {
      console.error('Error deleting product:', err)
      error.value = err.message || 'Erro ao excluir o produto'
      return false
    } finally {
      loading.value = false
    }
  }
  
  const uploadProductImage = async (
    productId: string, 
    file: File, 
    type: 'thumb' | 'gallery' = 'gallery',
    alt: string = '',
    position: number = 0
  ) => {
    try {
      loading.value = true
      error.value = null
      
      // 1. Upload da imagem para o storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${type}/${productId}/${Date.now()}.${fileExt}`
      
      const { data: storageData, error: storageError } = await supabase
        .storage
        .from('ecommerce')
        .upload(`img/${fileName}`, file)
      
      if (storageError) throw storageError
      
      // 2. Registrar o metadata da imagem no banco
      const { data: imageData, error: imageError } = await supabase
        .from('ecommerce_images')
        .insert({
          product_id: productId,
          type,
          path: `img/${fileName}`,
          alt,
          position
        })
        .select()
        .single()
      
      if (imageError) throw imageError
      
      return {
        ...imageData,
        url: `${process.env.SUPABASE_URL}/storage/v1/object/public/ecommerce/img/${fileName}`
      }
    } catch (err: any) {
      console.error('Error uploading image:', err)
      error.value = err.message || 'Erro ao fazer upload da imagem'
      return null
    } finally {
      loading.value = false
    }
  }
  
  const deleteProductImage = async (imageId: string) => {
    try {
      loading.value = true
      error.value = null
      
      // 1. Primeiro buscar o caminho da imagem
      const { data: imageData, error: fetchError } = await supabase
        .from('ecommerce_images')
        .select('path')
        .eq('id', imageId)
        .single()
      
      if (fetchError) throw fetchError
      
      // 2. Deletar do banco de dados
      const { error: deleteError } = await supabase
        .from('ecommerce_images')
        .delete()
        .eq('id', imageId)
      
      if (deleteError) throw deleteError
      
      // 3. Deletar do storage
      if (imageData?.path) {
        const { error: storageError } = await supabase
          .storage
          .from('ecommerce')
          .remove([imageData.path])
        
        if (storageError) throw storageError
      }
      
      return true
    } catch (err: any) {
      console.error('Error deleting image:', err)
      error.value = err.message || 'Erro ao excluir a imagem'
      return false
    } finally {
      loading.value = false
    }
  }
  
  return {
    products,
    loading,
    error,
    totalProducts,
    currentPage,
    pageSize,
    fetchProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    uploadProductImage,
    deleteProductImage
  }
} 