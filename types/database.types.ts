export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '12.2.3 (519615d)'
  }
  public: {
    Tables: {
      articles: {
        Row: {
          author_id: string | null
          category_id: number | null
          content: string | null
          created_at: string
          id: number
          meta_description: string | null
          publish_status: Database['public']['Enums']['publish_status'] | null
          slug: string | null
          tenant_id: string | null
          thumb_url: string
          title: string | null
          update_at: string | null
        }
        Insert: {
          author_id?: string | null
          category_id?: number | null
          content?: string | null
          created_at?: string
          id?: number
          meta_description?: string | null
          publish_status?: Database['public']['Enums']['publish_status'] | null
          slug?: string | null
          tenant_id?: string | null
          thumb_url?: string
          title?: string | null
          update_at?: string | null
        }
        Update: {
          author_id?: string | null
          category_id?: number | null
          content?: string | null
          created_at?: string
          id?: number
          meta_description?: string | null
          publish_status?: Database['public']['Enums']['publish_status'] | null
          slug?: string | null
          tenant_id?: string | null
          thumb_url?: string
          title?: string | null
          update_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'articles_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'articles_category'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'articles_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenant'
            referencedColumns: ['id']
          },
        ]
      }
      articles_category: {
        Row: {
          created_at: string
          description: string | null
          id: number
          publish_status: Database['public']['Enums']['publish_status'] | null
          slug: string | null
          tenant_id: string
          title: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: number
          publish_status?: Database['public']['Enums']['publish_status'] | null
          slug?: string | null
          tenant_id: string
          title?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: number
          publish_status?: Database['public']['Enums']['publish_status'] | null
          slug?: string | null
          tenant_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'articles_category_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenant'
            referencedColumns: ['id']
          },
        ]
      }
      articles_tag: {
        Row: {
          created_at: string
          description: string | null
          id: number
          publish_status: Database['public']['Enums']['publish_status'] | null
          slug: string | null
          tenant_id: string
          title: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: number
          publish_status?: Database['public']['Enums']['publish_status'] | null
          slug?: string | null
          tenant_id: string
          title?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: number
          publish_status?: Database['public']['Enums']['publish_status'] | null
          slug?: string | null
          tenant_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'articles_tag_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenant'
            referencedColumns: ['id']
          },
        ]
      }
      articles_tag_relations: {
        Row: {
          article_id: number | null
          created_at: string
          id: number
          tag_id: number | null
          tenant_id: string | null
        }
        Insert: {
          article_id?: number | null
          created_at?: string
          id?: number
          tag_id?: number | null
          tenant_id?: string | null
        }
        Update: {
          article_id?: number | null
          created_at?: string
          id?: number
          tag_id?: number | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'articles_tag_relations_article_id_fkey'
            columns: ['article_id']
            isOneToOne: false
            referencedRelation: 'articles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'articles_tag_relations_tag_id_fkey'
            columns: ['tag_id']
            isOneToOne: false
            referencedRelation: 'articles_tag'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'articles_tag_relations_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenant'
            referencedColumns: ['id']
          },
        ]
      }
      crm_company: {
        Row: {
          address: string | null
          cep: string | null
          city: string | null
          country: string | null
          created_at: string
          id: string
          industry: string | null
          name: string
          notes: string | null
          size: Database['public']['Enums']['crm_company_size'] | null
          tenant_id: string
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          cep?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          name: string
          notes?: string | null
          size?: Database['public']['Enums']['crm_company_size'] | null
          tenant_id: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          cep?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          name?: string
          notes?: string | null
          size?: Database['public']['Enums']['crm_company_size'] | null
          tenant_id?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'crm_company_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenant'
            referencedColumns: ['id']
          },
        ]
      }
      crm_contact: {
        Row: {
          company_id: string | null
          created_at: string
          email: string
          id: string
          last_contact: string | null
          lead_id: string | null
          name: string
          notes: string | null
          phone: string
          position: string | null
          tags: string[] | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          email: string
          id?: string
          last_contact?: string | null
          lead_id?: string | null
          name: string
          notes?: string | null
          phone: string
          position?: string | null
          tags?: string[] | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          email?: string
          id?: string
          last_contact?: string | null
          lead_id?: string | null
          name?: string
          notes?: string | null
          phone?: string
          position?: string | null
          tags?: string[] | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'crm_contact_company_id_fkey'
            columns: ['company_id']
            isOneToOne: false
            referencedRelation: 'crm_company'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'crm_contact_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'crm_lead'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'crm_contact_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenant'
            referencedColumns: ['id']
          },
        ]
      }
      crm_lead: {
        Row: {
          assigned_to: string | null
          company: string | null
          created_at: string
          id: string
          last_contact: string | null
          name: string
          next_follow_up: string | null
          notes: string | null
          pipeline_id: string | null
          priority: Database['public']['Enums']['crm_lead_priority']
          sales_stage_id: string | null
          source: Database['public']['Enums']['crm_lead_source']
          status: Database['public']['Enums']['crm_lead_status']
          tags: string[] | null
          tenant_id: string
          updated_at: string
          value: number
        }
        Insert: {
          assigned_to?: string | null
          company?: string | null
          created_at?: string
          id?: string
          last_contact?: string | null
          name: string
          next_follow_up?: string | null
          notes?: string | null
          pipeline_id?: string | null
          priority: Database['public']['Enums']['crm_lead_priority']
          sales_stage_id?: string | null
          source: Database['public']['Enums']['crm_lead_source']
          status: Database['public']['Enums']['crm_lead_status']
          tags?: string[] | null
          tenant_id: string
          updated_at?: string
          value: number
        }
        Update: {
          assigned_to?: string | null
          company?: string | null
          created_at?: string
          id?: string
          last_contact?: string | null
          name?: string
          next_follow_up?: string | null
          notes?: string | null
          pipeline_id?: string | null
          priority?: Database['public']['Enums']['crm_lead_priority']
          sales_stage_id?: string | null
          source?: Database['public']['Enums']['crm_lead_source']
          status?: Database['public']['Enums']['crm_lead_status']
          tags?: string[] | null
          tenant_id?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: 'crm_lead_pipeline_id_fkey'
            columns: ['pipeline_id']
            isOneToOne: false
            referencedRelation: 'crm_pipeline'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'crm_lead_sales_stage_id_fkey'
            columns: ['sales_stage_id']
            isOneToOne: false
            referencedRelation: 'crm_sales_stage'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'crm_lead_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenant'
            referencedColumns: ['id']
          },
        ]
      }
      crm_lead_source_table: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_default: boolean
          name: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'crm_lead_source_table_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenant'
            referencedColumns: ['id']
          },
        ]
      }
      crm_meeting: {
        Row: {
          attendees: string[] | null
          company_id: string | null
          contact_id: string | null
          created_at: string
          created_by: string
          description: string | null
          end_time: string
          id: string
          lead_id: string | null
          location: string | null
          notes: string | null
          outcome: string | null
          start_time: string
          status: Database['public']['Enums']['crm_meeting_status']
          tenant_id: string
          title: string
          type: Database['public']['Enums']['crm_meeting_type']
          updated_at: string
        }
        Insert: {
          attendees?: string[] | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          end_time: string
          id?: string
          lead_id?: string | null
          location?: string | null
          notes?: string | null
          outcome?: string | null
          start_time: string
          status: Database['public']['Enums']['crm_meeting_status']
          tenant_id: string
          title: string
          type: Database['public']['Enums']['crm_meeting_type']
          updated_at?: string
        }
        Update: {
          attendees?: string[] | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          end_time?: string
          id?: string
          lead_id?: string | null
          location?: string | null
          notes?: string | null
          outcome?: string | null
          start_time?: string
          status?: Database['public']['Enums']['crm_meeting_status']
          tenant_id?: string
          title?: string
          type?: Database['public']['Enums']['crm_meeting_type']
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'crm_meeting_company_id_fkey'
            columns: ['company_id']
            isOneToOne: false
            referencedRelation: 'crm_company'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'crm_meeting_contact_id_fkey'
            columns: ['contact_id']
            isOneToOne: false
            referencedRelation: 'crm_contact'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'crm_meeting_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'crm_lead'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'crm_meeting_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenant'
            referencedColumns: ['id']
          },
        ]
      }
      crm_pipeline: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          priority: number | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          priority?: number | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          priority?: number | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'crm_pipeline_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenant'
            referencedColumns: ['id']
          },
        ]
      }
      crm_sales_stage: {
        Row: {
          color: string
          description: string | null
          id: string
          is_default: boolean
          name: string
          order: number
          pipeline_id: string | null
          tenant_id: string | null
        }
        Insert: {
          color: string
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          order: number
          pipeline_id?: string | null
          tenant_id?: string | null
        }
        Update: {
          color?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          order?: number
          pipeline_id?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'crm_sales_stage_pipeline_id_fkey'
            columns: ['pipeline_id']
            isOneToOne: false
            referencedRelation: 'crm_pipeline'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'crm_sales_stage_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenant'
            referencedColumns: ['id']
          },
        ]
      }
      crm_whatsapp_conversation: {
        Row: {
          contact_id: string | null
          contact_name: string
          contact_phone: string
          id: string
          is_online: boolean
          last_message: string
          last_message_time: string
          lead_id: string | null
          profile_picture: string | null
          remote_jid: string
          tenant_id: string
          unread_count: number
        }
        Insert: {
          contact_id?: string | null
          contact_name: string
          contact_phone: string
          id?: string
          is_online: boolean
          last_message: string
          last_message_time: string
          lead_id?: string | null
          profile_picture?: string | null
          remote_jid: string
          tenant_id: string
          unread_count: number
        }
        Update: {
          contact_id?: string | null
          contact_name?: string
          contact_phone?: string
          id?: string
          is_online?: boolean
          last_message?: string
          last_message_time?: string
          lead_id?: string | null
          profile_picture?: string | null
          remote_jid?: string
          tenant_id?: string
          unread_count?: number
        }
        Relationships: [
          {
            foreignKeyName: 'crm_whatsapp_conversation_contact_id_fkey'
            columns: ['contact_id']
            isOneToOne: false
            referencedRelation: 'crm_contact'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'crm_whatsapp_conversation_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'crm_lead'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'crm_whatsapp_conversation_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenant'
            referencedColumns: ['id']
          },
        ]
      }
      crm_whatsapp_message: {
        Row: {
          contact_id: string | null
          file_name: string | null
          from_me: boolean
          id: string
          instance_id: string
          lead_id: string | null
          media_url: string | null
          message: string
          message_type: string
          remote_jid: string
          status: string
          tenant_id: string
          timestamp: string
        }
        Insert: {
          contact_id?: string | null
          file_name?: string | null
          from_me: boolean
          id?: string
          instance_id: string
          lead_id?: string | null
          media_url?: string | null
          message: string
          message_type: string
          remote_jid: string
          status: string
          tenant_id: string
          timestamp: string
        }
        Update: {
          contact_id?: string | null
          file_name?: string | null
          from_me?: boolean
          id?: string
          instance_id?: string
          lead_id?: string | null
          media_url?: string | null
          message?: string
          message_type?: string
          remote_jid?: string
          status?: string
          tenant_id?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: 'crm_whatsapp_message_contact_id_fkey'
            columns: ['contact_id']
            isOneToOne: false
            referencedRelation: 'crm_contact'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'crm_whatsapp_message_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'crm_lead'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'crm_whatsapp_message_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenant'
            referencedColumns: ['id']
          },
        ]
      }
      tenant: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      tenant_modules: {
        Row: {
          activated_at: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          module_name: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          activated_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          module_name: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          activated_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          module_name?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'tenant_modules_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenant'
            referencedColumns: ['id']
          },
        ]
      }
      user_tenant_role: {
        Row: {
          created_at: string
          id: string
          role: Database['public']['Enums']['app_role']
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database['public']['Enums']['app_role']
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database['public']['Enums']['app_role']
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_tenant_role_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenant'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_user_to_tenant: {
        Args: {
          p_user_id: string
          p_tenant_id: string
          p_role?: Database['public']['Enums']['app_role']
        }
        Returns: string
      }
      change_user_role_in_tenant: {
        Args: {
          p_user_id: string
          p_tenant_id: string
          p_new_role: Database['public']['Enums']['app_role']
        }
        Returns: boolean
      }
      create_tenant_and_add_admin: {
        Args: { p_name: string, p_slug: string }
        Returns: string
      }
      remove_user_from_tenant: {
        Args: { p_user_id: string, p_tenant_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: 'admin' | 'cliente' | 'funcionario'
      crm_company_size: 'startup' | 'small' | 'medium' | 'large' | 'enterprise'
      crm_lead_priority: 'low' | 'medium' | 'high'
      crm_lead_source:
        | 'website'
        | 'referral'
        | 'social'
        | 'email'
        | 'phone'
        | 'other'
      crm_lead_status:
        | 'new'
        | 'contacted'
        | 'qualified'
        | 'proposal'
        | 'negotiation'
        | 'won'
        | 'lost'
      crm_meeting_status: 'scheduled' | 'completed' | 'cancelled' | 'no-show'
      crm_meeting_type: 'call' | 'video' | 'in-person' | 'demo'
      publish_status: 'published' | 'draft' | 'arquived' | 'scheduled'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
  | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
      ? R
      : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
    DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
      DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
        ? R
        : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema['Tables']
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
    Insert: infer I
  }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema['Tables']
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
    Update: infer U
  }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
  | keyof DefaultSchema['Enums']
  | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof DefaultSchema['CompositeTypes']
  | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ['admin', 'cliente', 'funcionario'],
      crm_company_size: ['startup', 'small', 'medium', 'large', 'enterprise'],
      crm_lead_priority: ['low', 'medium', 'high'],
      crm_lead_source: [
        'website',
        'referral',
        'social',
        'email',
        'phone',
        'other',
      ],
      crm_lead_status: [
        'new',
        'contacted',
        'qualified',
        'proposal',
        'negotiation',
        'won',
        'lost',
      ],
      crm_meeting_status: ['scheduled', 'completed', 'cancelled', 'no-show'],
      crm_meeting_type: ['call', 'video', 'in-person', 'demo'],
      publish_status: ['published', 'draft', 'arquived', 'scheduled'],
    },
  },
} as const
