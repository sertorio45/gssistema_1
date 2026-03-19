export interface Database {
  public: {
    Tables: {
      articles_category: {
        Row: {
          id: number
          title: string
          slug: string
          description: string
          publish_status: string
          tenant_id: number
          created_at?: string
          updated_at?: string
        }
        Insert: {
          id?: number
          title: string
          slug: string
          description?: string
          publish_status?: string
          tenant_id: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          title?: string
          slug?: string
          description?: string
          publish_status?: string
          tenant_id?: number
          created_at?: string
          updated_at?: string
        }
      }
      // Adicione outras tabelas conforme necessário
    }
  }
}
