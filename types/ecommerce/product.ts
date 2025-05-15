import type { ProductImage } from './product-image'

export type ProductStatus = 'draft' | 'active' | 'inactive' | 'archived'
export type InventoryPolicy = 'deny' | 'continue'

export interface Product {
  id?: string
  title: string
  slug: string
  description: string
  short_description?: string
  sku: string
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
  images: ProductImage[]
  created_at?: string
  updated_at?: string
} 