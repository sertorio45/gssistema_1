export interface Tag {
  id: string
  name: string
  slug: string
  description?: string
  is_active: boolean
  created_at?: string
  updated_at?: string
  tenant_id?: string
}

export interface Category {
  id: string
  title: string
  slug: string
  description: string
  publish_status: string
}

export interface TagForm {
  name: string
  slug: string
  description?: string
  is_active: boolean
}

export interface CategoryForm {
  id: string
  title: string
  slug: string
  description: string
  publish_status: string
}

export interface TagUpdateForm extends TagForm {
  id: string
}

export interface CategoryUpdateForm extends CategoryForm {
  id: string
}

export interface Article {
  id: string
  title: string
  slug: string
  content: string
  excerpt?: string
  featured_image: string
  is_published: boolean
  is_public: boolean
  published_at?: string
  created_at?: string
  updated_at?: string
  tenant_id?: string
  author_id?: string
  category_id: string
  meta_description: string
  status: string
}

export interface ArticleForm {
  title: string
  slug: string
  content: string
  excerpt?: string
  featured_image: string
  is_published: boolean
  is_public: boolean
  published_at?: string
  category_id: string
  tags: string[]
  meta_description: string
  status: string
}

export interface ArticleUpdateForm extends ArticleForm {
  id: string
}

export interface ValidationError {
  message: string
  field?: string
}
