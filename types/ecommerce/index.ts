import type { ProductImage } from './product-image'

export type ProductStatus = 'draft' | 'active' | 'inactive' | 'archived'
export type InventoryPolicy = 'deny' | 'continue'

export interface Category {
  id: string
  name: string
  slug: string
  description?: string
  parent_id?: string
  meta_title?: string
  meta_description?: string
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  title: string
  slug: string
  description?: string
  short_description?: string
  sku?: string
  status: ProductStatus
  price: number
  compare_at_price?: number
  cost_price?: number
  inventory_policy: InventoryPolicy
  inventory_quantity: number
  category_id?: string
  weight?: number
  weight_unit?: string
  meta_title?: string
  meta_description?: string
  vendor?: string
  images?: ProductImage[]
  created_at: string
  updated_at: string
  category?: Category
  variants?: Variant[]
}

export interface Variant {
  id: string
  product_id: string
  title: string
  sku?: string
  price: number
  compare_at_price?: number
  cost_price?: number
  inventory_quantity: number
  weight?: number
  weight_unit?: string
  option1_name?: string
  option1_value?: string
  option2_name?: string
  option2_value?: string
  option3_name?: string
  option3_value?: string
  created_at: string
  updated_at: string
  images?: ProductImage[]
}

export interface ProductImage {
  id: string
  product_id: string
  variant_id?: string
  url: string
  filename?: string
  alt_text?: string
  position: number
  width?: number
  height?: number
  created_at: string
  updated_at: string
}

export interface Integration {
  id: string
  platform: string
  api_key?: string
  api_secret?: string
  store_url?: string
  store_name?: string
  is_active: boolean
  settings: Record<string, any>
  last_sync_at?: string
  created_at: string
  updated_at: string
}

export type CreateProductDTO = Omit<Product, 'id' | 'slug' | 'created_at' | 'updated_at'>
export type UpdateProductDTO = Partial<CreateProductDTO> 