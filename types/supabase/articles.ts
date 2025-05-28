import type { Database } from './database.types'

export type ArticleCategory = Database['public']['Tables']['articles_category']['Row']
export type ArticleCategoryInsert = Database['public']['Tables']['articles_category']['Insert']
export type ArticleCategoryUpdate = Database['public']['Tables']['articles_category']['Update']

// Enum para status de publicação
export type PublishStatus = 'draft' | 'published' | 'arquived' | 'scheduled'

// Interface adicional para tipagem mais específica
export interface ArticleCategoryExtended extends ArticleCategory {
  publish_status: PublishStatus
} 