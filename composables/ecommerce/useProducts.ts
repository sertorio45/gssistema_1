import type { Product, ProductStatus } from '~/types/ecommerce/product'
import type { ProductImage } from '~/types/ecommerce/product-image'
import { useSupabaseClient } from '#imports'
import { computed, ref } from 'vue'

export function useProducts() {
  const supabase = useSupabaseClient()
  const products = ref<Product[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const totalProducts = ref(0)

  async function fetchProducts(params: {
    page?: number
    search?: string
    status?: ProductStatus
    category_id?: string
  } = {}) {
    const { page = 1, search, status, category_id } = params
    const limit = 10
    const offset = (page - 1) * limit

    loading.value = true
    error.value = null

    try {
      let query = supabase
        .from('ecommerce_products')
        .select('*, images:ecommerce_images(*)', { count: 'exact' })

      if (search) {
        query = query.or(`title.ilike.%${search}%,sku.ilike.%${search}%`)
      }

      if (status) {
        query = query.eq('status', status)
      }

      if (category_id) {
        query = query.eq('category_id', category_id)
      }

      const { data, error: supabaseError, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (supabaseError) {
        throw supabaseError
      }

      products.value = data
      totalProducts.value = count || 0
    }
    catch (err) {
      console.error('Error fetching products:', err)
      error.value = (err as Error).message
      throw err
    }
    finally {
      loading.value = false
    }
  }

  async function getProductBySlug(slug: string) {
    try {
      const { data, error: supabaseError } = await supabase
        .from('ecommerce_products')
        .select('*, images:ecommerce_images(*)')
        .eq('slug', slug)
        .single()

      if (supabaseError) {
        throw supabaseError
      }

      return data
    }
    catch (err) {
      console.error('Error fetching product:', err)
      error.value = (err as Error).message
      throw err
    }
  }

  async function createProduct(product: Partial<Product>) {
    try {
      const { data, error: supabaseError } = await supabase
        .from('ecommerce_products')
        .insert(product)
        .select('*')
        .single()

      if (supabaseError) {
        throw supabaseError
      }

      return data
    }
    catch (err) {
      console.error('Error creating product:', err)
      error.value = (err as Error).message
      throw err
    }
  }

  async function updateProduct(id: string, product: Partial<Product>) {
    try {
      const { data, error: supabaseError } = await supabase
        .from('ecommerce_products')
        .update(product)
        .eq('id', id)
        .select('*')
        .single()

      if (supabaseError) {
        throw supabaseError
      }

      return data
    }
    catch (err) {
      console.error('Error updating product:', err)
      error.value = (err as Error).message
      throw err
    }
  }

  async function deleteProduct(id: string) {
    try {
      const { error: supabaseError } = await supabase
        .from('ecommerce_products')
        .delete()
        .eq('id', id)

      if (supabaseError) {
        throw supabaseError
      }

      return true
    }
    catch (err) {
      console.error('Error deleting product:', err)
      error.value = (err as Error).message
      throw err
    }
  }

  return {
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    products: computed(() => products.value),
    totalProducts: computed(() => totalProducts.value),
    fetchProducts,
    getProductBySlug,
    createProduct,
    updateProduct,
    deleteProduct,
  }
} 