export interface Tag {
  id: string
  title: string
  status: string
  created_at?: string
  updated_at?: string
}

export interface Category {
  id: string
  title: string
  status: string
  created_at?: string
  updated_at?: string
}

export interface TagForm {
  title: string
  status: string
}

export interface CategoryForm {
  title: string
  status: string
}

export interface TagUpdateForm extends TagForm {
  id: string
}

export interface CategoryUpdateForm extends CategoryForm {
  id: string
}

export interface ValidationError {
  message: string
  field?: string
} 