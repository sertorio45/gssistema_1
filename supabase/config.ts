import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// Tipos das tabelas do Supabase
export type Tables = {
  categories: {
    Row: {
      id: string
      name: string
      slug: string
      description: string | null
      parent_id: string | null
      created_at: string
      updated_at: string
    }
    Insert: {
      id?: string
      name: string
      slug: string
      description?: string | null
      parent_id?: string | null
      created_at?: string
      updated_at?: string
    }
    Update: {
      id?: string
      name?: string
      slug?: string
      description?: string | null
      parent_id?: string | null
      created_at?: string
      updated_at?: string
    }
  }
} 