export interface ProductImage {
  id: string
  product_id: string
  url: string
  filename?: string
  alt_text?: string
  is_thumbnail: boolean
  position: number
  width?: number
  height?: number
  created_at?: string
  updated_at?: string
}

export type CreateProductImageDTO = Omit<ProductImage, 'id' | 'created_at' | 'updated_at'>
export type UpdateProductImageDTO = Partial<CreateProductImageDTO> 