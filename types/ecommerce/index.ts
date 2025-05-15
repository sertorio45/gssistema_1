export type ProductStatus = 'draft' | 'published' | 'archived'

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  parent_id: string | null
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  title: string
  slug: string
  sku: string | null
  description: string | null
  price: number
  compare_at_price: number | null
  status: ProductStatus
  inventory: number
  meta_title: string | null
  meta_description: string | null
  category_id: string | null
  created_at: string
  updated_at: string
  category?: Category
  variants?: Variant[]
  images?: ProductImage[]
  thumb?: ProductImage
  gallery?: ProductImage[]
}

export interface Variant {
  id: string
  product_id: string
  title: string
  sku: string | null
  price: number
  inventory: number
  created_at: string
  updated_at: string
}

export type ImageType = 'thumb' | 'gallery'

export interface ProductImage {
  id: string
  product_id: string
  type: ImageType
  path: string
  alt: string | null
  position: number
  created_at: string
  updated_at: string
  url?: string
}

export interface Integration {
  id: string
  platform: string
  api_key: string | null
  store_url: string | null
  user_id: string
  created_at: string
  updated_at: string
}

export interface ProductFilters {
  search?: string
  category_id?: string
  status?: ProductStatus
  minPrice?: number
  maxPrice?: number
  sort?: 'title' | 'price' | 'created_at' | 'inventory'
  order?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

export interface ProductFormData {
  title: string
  slug?: string
  sku?: string
  description?: string
  price: number
  compare_at_price?: number
  status: ProductStatus
  inventory: number
  meta_title?: string
  meta_description?: string
  category_id?: string
}

export interface VariantFormData {
  title: string
  sku?: string
  price: number
  inventory: number
}

export interface ImageUploadData {
  file: File
  alt?: string
  type: ImageType
  position?: number
}

export interface IntegrationFormData {
  platform: string
  api_key?: string
  store_url?: string
}
