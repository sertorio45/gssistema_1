export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      agency_client_onboardings: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          current_step: string
          error_message: string | null
          id: string
          organization_id: string
          payload: Json
          status: Database["public"]["Enums"]["agency_onboarding_status"]
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          current_step?: string
          error_message?: string | null
          id?: string
          organization_id: string
          payload?: Json
          status?: Database["public"]["Enums"]["agency_onboarding_status"]
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          current_step?: string
          error_message?: string | null
          id?: string
          organization_id?: string
          payload?: Json
          status?: Database["public"]["Enums"]["agency_onboarding_status"]
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_client_onboardings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_client_onboardings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_decisions: {
        Row: {
          approver_id: string
          change_category:
            | Database["public"]["Enums"]["approval_change_category"]
            | null
          comment: string | null
          created_at: string
          decision: string
          id: string
          request_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          approver_id: string
          change_category?:
            | Database["public"]["Enums"]["approval_change_category"]
            | null
          comment?: string | null
          created_at?: string
          decision: string
          id?: string
          request_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          approver_id?: string
          change_category?:
            | Database["public"]["Enums"]["approval_change_category"]
            | null
          comment?: string | null
          created_at?: string
          decision?: string
          id?: string
          request_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_decisions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_decisions_request_tenant_fkey"
            columns: ["request_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "approval_decisions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_request_approvers: {
        Row: {
          assigned_capability: string | null
          created_at: string
          id: string
          is_alternate: boolean
          request_id: string
          role_id: string | null
          role_name: string | null
          role_slug: string | null
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_capability?: string | null
          created_at?: string
          id?: string
          is_alternate?: boolean
          request_id: string
          role_id?: string | null
          role_name?: string | null
          role_slug?: string | null
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_capability?: string | null
          created_at?: string
          id?: string
          is_alternate?: boolean
          request_id?: string
          role_id?: string | null
          role_name?: string | null
          role_slug?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_request_approvers_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_request_approvers_request_tenant_fkey"
            columns: ["request_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "approval_request_approvers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_requests: {
        Row: {
          created_at: string
          due_at: string | null
          id: string
          locked_at: string | null
          locked_by: string | null
          minimum_approvals: number
          next_approver_ids: string[] | null
          policy: string
          post_id: string
          requested_by: string
          resolved_at: string | null
          run_group_id: string
          run_status: Database["public"]["Enums"]["social_approval_run_status"]
          stage: Database["public"]["Enums"]["approval_stage"]
          stage_position: number | null
          status: Database["public"]["Enums"]["approval_status"]
          superseded_at: string | null
          tenant_id: string
          updated_at: string
          version_id: string
          workflow_id: string | null
          workflow_stage_id: string | null
        }
        Insert: {
          created_at?: string
          due_at?: string | null
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          minimum_approvals?: number
          next_approver_ids?: string[] | null
          policy?: string
          post_id: string
          requested_by: string
          resolved_at?: string | null
          run_group_id?: string
          run_status?: Database["public"]["Enums"]["social_approval_run_status"]
          stage?: Database["public"]["Enums"]["approval_stage"]
          stage_position?: number | null
          status?: Database["public"]["Enums"]["approval_status"]
          superseded_at?: string | null
          tenant_id: string
          updated_at?: string
          version_id: string
          workflow_id?: string | null
          workflow_stage_id?: string | null
        }
        Update: {
          created_at?: string
          due_at?: string | null
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          minimum_approvals?: number
          next_approver_ids?: string[] | null
          policy?: string
          post_id?: string
          requested_by?: string
          resolved_at?: string | null
          run_group_id?: string
          run_status?: Database["public"]["Enums"]["social_approval_run_status"]
          stage?: Database["public"]["Enums"]["approval_stage"]
          stage_position?: number | null
          status?: Database["public"]["Enums"]["approval_status"]
          superseded_at?: string | null
          tenant_id?: string
          updated_at?: string
          version_id?: string
          workflow_id?: string | null
          workflow_stage_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_requests_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_post_tenant_fkey"
            columns: ["post_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "approval_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "content_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_version_post_tenant_fkey"
            columns: ["version_id", "post_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "content_versions"
            referencedColumns: ["id", "post_id", "tenant_id"]
          },
          {
            foreignKeyName: "approval_requests_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "social_approval_workflows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_workflow_stage_id_fkey"
            columns: ["workflow_stage_id"]
            isOneToOne: false
            referencedRelation: "social_approval_workflow_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          author_id: string | null
          category_id: number | null
          content: string | null
          created_at: string
          id: number
          meta_description: string | null
          publish_status: Database["public"]["Enums"]["publish_status"] | null
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
          publish_status?: Database["public"]["Enums"]["publish_status"] | null
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
          publish_status?: Database["public"]["Enums"]["publish_status"] | null
          slug?: string | null
          tenant_id?: string | null
          thumb_url?: string
          title?: string | null
          update_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "articles_category"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      articles_category: {
        Row: {
          created_at: string
          description: string | null
          id: number
          publish_status: Database["public"]["Enums"]["publish_status"] | null
          slug: string | null
          tenant_id: string
          title: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: number
          publish_status?: Database["public"]["Enums"]["publish_status"] | null
          slug?: string | null
          tenant_id: string
          title?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: number
          publish_status?: Database["public"]["Enums"]["publish_status"] | null
          slug?: string | null
          tenant_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "articles_category_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      articles_tag: {
        Row: {
          created_at: string
          description: string | null
          id: number
          publish_status: Database["public"]["Enums"]["publish_status"] | null
          slug: string | null
          tenant_id: string
          title: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: number
          publish_status?: Database["public"]["Enums"]["publish_status"] | null
          slug?: string | null
          tenant_id: string
          title?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: number
          publish_status?: Database["public"]["Enums"]["publish_status"] | null
          slug?: string | null
          tenant_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "articles_tag_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
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
            foreignKeyName: "articles_tag_relations_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_tag_relations_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "articles_tag"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_tag_relations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action: string
          actor_id: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip: unknown
          organization_id: string | null
          request_id: string | null
          tenant_id: string | null
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip?: unknown
          organization_id?: string | null
          request_id?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip?: unknown
          organization_id?: string | null
          request_id?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      capabilities: {
        Row: {
          created_at: string
          description: string
          key: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          key: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          key?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "capabilities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      content_versions: {
        Row: {
          checksum: string
          created_at: string
          created_by: string
          id: string
          post_id: string
          snapshot: Json
          tenant_id: string
          updated_at: string
          version: number
        }
        Insert: {
          checksum: string
          created_at?: string
          created_by: string
          id?: string
          post_id: string
          snapshot: Json
          tenant_id: string
          updated_at?: string
          version: number
        }
        Update: {
          checksum?: string
          created_at?: string
          created_by?: string
          id?: string
          post_id?: string
          snapshot?: Json
          tenant_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "content_versions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_versions_post_tenant_fkey"
            columns: ["post_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "content_versions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
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
          name: string
          notes: string | null
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
          name: string
          notes?: string | null
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
          name?: string
          notes?: string | null
          tenant_id?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_company_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
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
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_contact_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_contact_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_lead"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_contact_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_funnel: {
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
            foreignKeyName: "crm_funnel_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_lead: {
        Row: {
          assigned_to: string | null
          closed_at: string | null
          company: string | null
          created_at: string
          fbc: string | null
          fbclid: string | null
          fbp: string | null
          funnel_id: string | null
          id: string
          last_contact: string | null
          meta_lead_id: string | null
          name: string
          next_follow_up: string | null
          notes: string | null
          priority: Database["public"]["Enums"]["crm_lead_priority"]
          sales_stage_id: string | null
          source: Database["public"]["Enums"]["crm_lead_source"]
          source_id: string | null
          status: Database["public"]["Enums"]["crm_lead_status"]
          tags: string[] | null
          tenant_id: string
          updated_at: string
          value: number
          values: Json
        }
        Insert: {
          assigned_to?: string | null
          closed_at?: string | null
          company?: string | null
          created_at?: string
          fbc?: string | null
          fbclid?: string | null
          fbp?: string | null
          funnel_id?: string | null
          id?: string
          last_contact?: string | null
          meta_lead_id?: string | null
          name: string
          next_follow_up?: string | null
          notes?: string | null
          priority: Database["public"]["Enums"]["crm_lead_priority"]
          sales_stage_id?: string | null
          source: Database["public"]["Enums"]["crm_lead_source"]
          source_id?: string | null
          status: Database["public"]["Enums"]["crm_lead_status"]
          tags?: string[] | null
          tenant_id: string
          updated_at?: string
          value: number
          values?: Json
        }
        Update: {
          assigned_to?: string | null
          closed_at?: string | null
          company?: string | null
          created_at?: string
          fbc?: string | null
          fbclid?: string | null
          fbp?: string | null
          funnel_id?: string | null
          id?: string
          last_contact?: string | null
          meta_lead_id?: string | null
          name?: string
          next_follow_up?: string | null
          notes?: string | null
          priority?: Database["public"]["Enums"]["crm_lead_priority"]
          sales_stage_id?: string | null
          source?: Database["public"]["Enums"]["crm_lead_source"]
          source_id?: string | null
          status?: Database["public"]["Enums"]["crm_lead_status"]
          tags?: string[] | null
          tenant_id?: string
          updated_at?: string
          value?: number
          values?: Json
        }
        Relationships: [
          {
            foreignKeyName: "crm_lead_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "crm_funnel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_lead_sales_stage_id_fkey"
            columns: ["sales_stage_id"]
            isOneToOne: false
            referencedRelation: "crm_sales_stage"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_lead_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "crm_lead_source_table"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_lead_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_meta_conversion_events: {
        Row: {
          action_source: string
          attempts: number
          created_at: string
          event_id: string
          event_name: string
          event_time: string
          id: string
          last_error: string | null
          lead_id: string
          meta_response: Json | null
          next_attempt_at: string
          payload_snapshot: Json | null
          sent_at: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          action_source?: string
          attempts?: number
          created_at?: string
          event_id?: string
          event_name: string
          event_time?: string
          id?: string
          last_error?: string | null
          lead_id: string
          meta_response?: Json | null
          next_attempt_at?: string
          payload_snapshot?: Json | null
          sent_at?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          action_source?: string
          attempts?: number
          created_at?: string
          event_id?: string
          event_name?: string
          event_time?: string
          id?: string
          last_error?: string | null
          lead_id?: string
          meta_response?: Json | null
          next_attempt_at?: string
          payload_snapshot?: Json | null
          sent_at?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_meta_conversion_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_lead"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_meta_conversion_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
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
            foreignKeyName: "crm_lead_source_table_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
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
          status: Database["public"]["Enums"]["crm_meeting_status"]
          tenant_id: string
          title: string
          type: Database["public"]["Enums"]["crm_meeting_type"]
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
          status: Database["public"]["Enums"]["crm_meeting_status"]
          tenant_id: string
          title: string
          type: Database["public"]["Enums"]["crm_meeting_type"]
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
          status?: Database["public"]["Enums"]["crm_meeting_status"]
          tenant_id?: string
          title?: string
          type?: Database["public"]["Enums"]["crm_meeting_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_meeting_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_meeting_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contact"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_meeting_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_lead"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_meeting_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_products: {
        Row: {
          active: boolean
          category: string | null
          category_id: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          price: number
          recurrence: string | null
          tags: string[] | null
          tenant_id: string
          type: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean
          category?: string | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          price?: number
          recurrence?: string | null
          tags?: string[] | null
          tenant_id: string
          type: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean
          category?: string | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          price?: number
          recurrence?: string | null
          tags?: string[] | null
          tenant_id?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "crm_products_category"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_products_category: {
        Row: {
          created_at: string | null
          id: string
          name: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      crm_sales_stage: {
        Row: {
          color: string
          description: string | null
          funnel_id: string | null
          id: string
          is_default: boolean
          name: string
          order: number
          tenant_id: string | null
        }
        Insert: {
          color: string
          description?: string | null
          funnel_id?: string | null
          id?: string
          is_default?: boolean
          name: string
          order: number
          tenant_id?: string | null
        }
        Update: {
          color?: string
          description?: string | null
          funnel_id?: string | null
          id?: string
          is_default?: boolean
          name?: string
          order?: number
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_sales_stage_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "crm_funnel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_sales_stage_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      dead_letter_events: {
        Row: {
          created_at: string
          id: string
          payload: Json
          reason: string
          resolved_at: string | null
          resolved_by: string | null
          source: string
          source_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          reason: string
          resolved_at?: string | null
          resolved_by?: string | null
          source: string
          source_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          reason?: string
          resolved_at?: string | null
          resolved_by?: string | null
          source?: string
          source_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dead_letter_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      deletion_jobs: {
        Row: {
          account_id: string
          attempts: number
          created_at: string
          deleted_at: string | null
          external_object_id: string | null
          external_object_type: string | null
          external_permalink: string | null
          format: Database["public"]["Enums"]["social_post_format"] | null
          id: string
          idempotency_key: string
          last_attempt_at: string | null
          last_error_code: string | null
          last_error_message: string | null
          locked_at: string | null
          locked_by: string | null
          manual_action_required: boolean
          manual_confirmed_at: string | null
          manual_confirmed_by: string | null
          max_attempts: number
          next_attempt_at: string | null
          platform: Database["public"]["Enums"]["social_platform"] | null
          post_id: string
          provider_code: string | null
          provider_message: string | null
          response_summary: Json
          retryable: boolean
          status: Database["public"]["Enums"]["deletion_job_status"]
          tenant_id: string
          updated_at: string
          variant_id: string
        }
        Insert: {
          account_id: string
          attempts?: number
          created_at?: string
          deleted_at?: string | null
          external_object_id?: string | null
          external_object_type?: string | null
          external_permalink?: string | null
          format?: Database["public"]["Enums"]["social_post_format"] | null
          id?: string
          idempotency_key: string
          last_attempt_at?: string | null
          last_error_code?: string | null
          last_error_message?: string | null
          locked_at?: string | null
          locked_by?: string | null
          manual_action_required?: boolean
          manual_confirmed_at?: string | null
          manual_confirmed_by?: string | null
          max_attempts?: number
          next_attempt_at?: string | null
          platform?: Database["public"]["Enums"]["social_platform"] | null
          post_id: string
          provider_code?: string | null
          provider_message?: string | null
          response_summary?: Json
          retryable?: boolean
          status?: Database["public"]["Enums"]["deletion_job_status"]
          tenant_id: string
          updated_at?: string
          variant_id: string
        }
        Update: {
          account_id?: string
          attempts?: number
          created_at?: string
          deleted_at?: string | null
          external_object_id?: string | null
          external_object_type?: string | null
          external_permalink?: string | null
          format?: Database["public"]["Enums"]["social_post_format"] | null
          id?: string
          idempotency_key?: string
          last_attempt_at?: string | null
          last_error_code?: string | null
          last_error_message?: string | null
          locked_at?: string | null
          locked_by?: string | null
          manual_action_required?: boolean
          manual_confirmed_at?: string | null
          manual_confirmed_by?: string | null
          max_attempts?: number
          next_attempt_at?: string | null
          platform?: Database["public"]["Enums"]["social_platform"] | null
          post_id?: string
          provider_code?: string | null
          provider_message?: string | null
          response_summary?: Json
          retryable?: boolean
          status?: Database["public"]["Enums"]["deletion_job_status"]
          tenant_id?: string
          updated_at?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deletion_jobs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "social_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deletion_jobs_account_tenant_fkey"
            columns: ["account_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "social_accounts"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "deletion_jobs_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deletion_jobs_post_tenant_fkey"
            columns: ["post_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "deletion_jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deletion_jobs_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "social_post_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deletion_jobs_variant_post_tenant_fkey"
            columns: ["variant_id", "post_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "social_post_variants"
            referencedColumns: ["id", "post_id", "tenant_id"]
          },
        ]
      }
      marketing_ads: {
        Row: {
          ai_generated: boolean | null
          campaign_id: string
          created_at: string | null
          creative_url: string | null
          cta: string | null
          description: string | null
          headline: string | null
          id: string
          meta_ad_id: string | null
          primary_text: string | null
          status: string | null
          tenant_id: string
        }
        Insert: {
          ai_generated?: boolean | null
          campaign_id: string
          created_at?: string | null
          creative_url?: string | null
          cta?: string | null
          description?: string | null
          headline?: string | null
          id?: string
          meta_ad_id?: string | null
          primary_text?: string | null
          status?: string | null
          tenant_id: string
        }
        Update: {
          ai_generated?: boolean | null
          campaign_id?: string
          created_at?: string | null
          creative_url?: string | null
          cta?: string | null
          description?: string | null
          headline?: string | null
          id?: string
          meta_ad_id?: string | null
          primary_text?: string | null
          status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_ads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_ads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_ai_messages: {
        Row: {
          campaign_id: string | null
          content: string
          created_at: string | null
          id: string
          role: string
          tenant_id: string
        }
        Insert: {
          campaign_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          role: string
          tenant_id: string
        }
        Update: {
          campaign_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          role?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_ai_messages_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_ai_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_campaign_cache: {
        Row: {
          cache_key: string
          created_at: string
          expires_at: string
          id: string
          payload: Json
          provider: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          cache_key: string
          created_at?: string
          expires_at: string
          id?: string
          payload: Json
          provider: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          cache_key?: string
          created_at?: string
          expires_at?: string
          id?: string
          payload?: Json
          provider?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_campaign_cache_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_campaign_metrics: {
        Row: {
          campaign_id: string
          clicks: number | null
          conversions: number | null
          cpc_cents: number | null
          cpm_cents: number | null
          ctr: number | null
          date: string
          fetched_at: string | null
          id: string
          impressions: number | null
          roas: number | null
          spend_cents: number | null
          tenant_id: string
        }
        Insert: {
          campaign_id: string
          clicks?: number | null
          conversions?: number | null
          cpc_cents?: number | null
          cpm_cents?: number | null
          ctr?: number | null
          date: string
          fetched_at?: string | null
          id?: string
          impressions?: number | null
          roas?: number | null
          spend_cents?: number | null
          tenant_id: string
        }
        Update: {
          campaign_id?: string
          clicks?: number | null
          conversions?: number | null
          cpc_cents?: number | null
          cpm_cents?: number | null
          ctr?: number | null
          date?: string
          fetched_at?: string | null
          id?: string
          impressions?: number | null
          roas?: number | null
          spend_cents?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_campaign_metrics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_campaign_metrics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_campaigns: {
        Row: {
          ai_strategy: Json | null
          briefing: Json | null
          created_at: string | null
          created_by: string | null
          daily_budget_cents: number | null
          end_date: string | null
          id: string
          meta_ad_account_id: string
          meta_campaign_id: string | null
          name: string
          objective: string
          start_date: string | null
          status: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          ai_strategy?: Json | null
          briefing?: Json | null
          created_at?: string | null
          created_by?: string | null
          daily_budget_cents?: number | null
          end_date?: string | null
          id?: string
          meta_ad_account_id: string
          meta_campaign_id?: string | null
          name: string
          objective: string
          start_date?: string | null
          status?: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          ai_strategy?: Json | null
          briefing?: Json | null
          created_at?: string | null
          created_by?: string | null
          daily_budget_cents?: number | null
          end_date?: string | null
          id?: string
          meta_ad_account_id?: string
          meta_campaign_id?: string | null
          name?: string
          objective?: string
          start_date?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_integrations: {
        Row: {
          config: Json
          created_at: string
          id: string
          is_active: boolean
          provider: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          provider: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          provider?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_integrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_report_logs: {
        Row: {
          channel: string
          created_at: string
          created_by: string | null
          destination: string
          id: string
          payload: Json
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          channel?: string
          created_at?: string
          created_by?: string | null
          destination: string
          id?: string
          payload?: Json
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          created_by?: string | null
          destination?: string
          id?: string
          payload?: Json
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_report_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      media_asset_variants: {
        Row: {
          asset_id: string
          created_at: string
          height: number | null
          id: string
          kind: string
          metadata: Json
          mime_type: string
          object_path: string
          platform: Database["public"]["Enums"]["social_platform"] | null
          tenant_id: string
          updated_at: string
          width: number | null
        }
        Insert: {
          asset_id: string
          created_at?: string
          height?: number | null
          id?: string
          kind: string
          metadata?: Json
          mime_type: string
          object_path: string
          platform?: Database["public"]["Enums"]["social_platform"] | null
          tenant_id: string
          updated_at?: string
          width?: number | null
        }
        Update: {
          asset_id?: string
          created_at?: string
          height?: number | null
          id?: string
          kind?: string
          metadata?: Json
          mime_type?: string
          object_path?: string
          platform?: Database["public"]["Enums"]["social_platform"] | null
          tenant_id?: string
          updated_at?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_asset_variants_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_asset_variants_asset_tenant_fkey"
            columns: ["asset_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "media_asset_variants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          bucket: string
          checksum: string | null
          created_at: string
          created_by: string
          duration_seconds: number | null
          height: number | null
          id: string
          metadata: Json
          mime_type: string
          name: string
          object_path: string
          purpose: Database["public"]["Enums"]["media_asset_purpose"]
          size_bytes: number
          status: string
          tenant_id: string
          updated_at: string
          width: number | null
        }
        Insert: {
          bucket?: string
          checksum?: string | null
          created_at?: string
          created_by: string
          duration_seconds?: number | null
          height?: number | null
          id?: string
          metadata?: Json
          mime_type: string
          name: string
          object_path: string
          purpose?: Database["public"]["Enums"]["media_asset_purpose"]
          size_bytes?: number
          status?: string
          tenant_id: string
          updated_at?: string
          width?: number | null
        }
        Update: {
          bucket?: string
          checksum?: string | null
          created_at?: string
          created_by?: string
          duration_seconds?: number | null
          height?: number | null
          id?: string
          metadata?: Json
          mime_type?: string
          name?: string
          object_path?: string
          purpose?: Database["public"]["Enums"]["media_asset_purpose"]
          size_bytes?: number
          status?: string
          tenant_id?: string
          updated_at?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          email: boolean
          event_type: string
          id: string
          in_app: boolean
          tenant_id: string
          updated_at: string
          user_id: string
          whatsapp: boolean
        }
        Insert: {
          created_at?: string
          email?: boolean
          event_type: string
          id?: string
          in_app?: boolean
          tenant_id: string
          updated_at?: string
          user_id: string
          whatsapp?: boolean
        }
        Update: {
          created_at?: string
          email?: boolean
          event_type?: string
          id?: string
          in_app?: boolean
          tenant_id?: string
          updated_at?: string
          user_id?: string
          whatsapp?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          body: string
          created_at: string
          id: string
          idempotency_key: string | null
          metadata: Json
          read_at: string | null
          tenant_id: string
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          body: string
          created_at?: string
          id?: string
          idempotency_key?: string | null
          metadata?: Json
          read_at?: string | null
          tenant_id: string
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          body?: string
          created_at?: string
          id?: string
          idempotency_key?: string | null
          metadata?: Json
          read_at?: string | null
          tenant_id?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_states: {
        Row: {
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          provider: string
          redirect_path: string
          state_hash: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          provider: string
          redirect_path?: string
          state_hash: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          provider?: string
          redirect_path?: string
          state_hash?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oauth_states_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invite_tenants: {
        Row: {
          created_at: string
          id: string
          invite_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invite_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invite_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invite_tenants_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "organization_invites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_invite_tenants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invites: {
        Row: {
          accepted_at: string | null
          accepted_user_id: string | null
          access_all_tenants: boolean
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          organization_id: string
          role_id: string
          status: string
          token: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_user_id?: string | null
          access_all_tenants?: boolean
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          organization_id: string
          role_id: string
          status?: string
          token?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_user_id?: string | null
          access_all_tenants?: boolean
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          organization_id?: string
          role_id?: string
          status?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_invites_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "organization_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_member_tenants: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          organization_membership_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          organization_membership_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          organization_membership_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_member_tenants_organization_membership_id_fkey"
            columns: ["organization_membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_member_tenants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_memberships: {
        Row: {
          access_all_tenants: boolean
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          role_id: string | null
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_all_tenants?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          role_id?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_all_tenants?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          role_id?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_memberships_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "organization_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_role_capabilities: {
        Row: {
          allowed: boolean
          capability: string
          created_at: string
          id: string
          role_id: string
          updated_at: string
        }
        Insert: {
          allowed?: boolean
          capability: string
          created_at?: string
          id?: string
          role_id: string
          updated_at?: string
        }
        Update: {
          allowed?: boolean
          capability?: string
          created_at?: string
          id?: string
          role_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_role_capabilities_capability_fkey"
            columns: ["capability"]
            isOneToOne: false
            referencedRelation: "capabilities"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "organization_role_capabilities_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "organization_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_roles: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          id: string
          is_default: boolean
          is_editable: boolean
          is_protected: boolean
          is_system: boolean
          legacy_app_role: Database["public"]["Enums"]["app_role"]
          name: string
          organization_id: string | null
          organization_type:
            | Database["public"]["Enums"]["organization_type"]
            | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          is_default?: boolean
          is_editable?: boolean
          is_protected?: boolean
          is_system?: boolean
          legacy_app_role?: Database["public"]["Enums"]["app_role"]
          name: string
          organization_id?: string | null
          organization_type?:
            | Database["public"]["Enums"]["organization_type"]
            | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          is_default?: boolean
          is_editable?: boolean
          is_protected?: boolean
          is_system?: boolean
          legacy_app_role?: Database["public"]["Enums"]["app_role"]
          name?: string
          organization_id?: string | null
          organization_type?:
            | Database["public"]["Enums"]["organization_type"]
            | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_tenants: {
        Row: {
          created_at: string
          created_by: string | null
          display_name: string | null
          ended_at: string | null
          id: string
          internal_owner_user_id: string | null
          is_active: boolean
          is_primary: boolean
          logo_url: string | null
          metadata: Json
          organization_id: string
          relationship_type: Database["public"]["Enums"]["organization_relationship_type"]
          started_at: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          display_name?: string | null
          ended_at?: string | null
          id?: string
          internal_owner_user_id?: string | null
          is_active?: boolean
          is_primary?: boolean
          logo_url?: string | null
          metadata?: Json
          organization_id: string
          relationship_type?: Database["public"]["Enums"]["organization_relationship_type"]
          started_at?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          display_name?: string | null
          ended_at?: string | null
          id?: string
          internal_owner_user_id?: string | null
          is_active?: boolean
          is_primary?: boolean
          logo_url?: string | null
          metadata?: Json
          organization_id?: string
          relationship_type?: Database["public"]["Enums"]["organization_relationship_type"]
          started_at?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_tenants_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_tenants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          settings: Json
          slug: string
          tenant_id: string | null
          type: Database["public"]["Enums"]["organization_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          settings?: Json
          slug: string
          tenant_id?: string | null
          type?: Database["public"]["Enums"]["organization_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          settings?: Json
          slug?: string
          tenant_id?: string | null
          type?: Database["public"]["Enums"]["organization_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      publication_attempts: {
        Row: {
          attempt_number: number
          created_at: string
          duration_ms: number | null
          error_code: string | null
          error_message: string | null
          external_post_id: string | null
          id: string
          job_id: string
          request_summary: Json
          response_summary: Json
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          attempt_number: number
          created_at?: string
          duration_ms?: number | null
          error_code?: string | null
          error_message?: string | null
          external_post_id?: string | null
          id?: string
          job_id: string
          request_summary?: Json
          response_summary?: Json
          status: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          attempt_number?: number
          created_at?: string
          duration_ms?: number | null
          error_code?: string | null
          error_message?: string | null
          external_post_id?: string | null
          id?: string
          job_id?: string
          request_summary?: Json
          response_summary?: Json
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "publication_attempts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "publication_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publication_attempts_job_tenant_fkey"
            columns: ["job_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "publication_jobs"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "publication_attempts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      publication_jobs: {
        Row: {
          account_id: string
          attempts: number
          created_at: string
          id: string
          idempotency_key: string
          last_error_code: string | null
          last_error_message: string | null
          locked_at: string | null
          locked_by: string | null
          max_attempts: number
          next_attempt_at: string | null
          post_id: string
          priority: number
          published_at: string | null
          scheduled_at: string
          status: Database["public"]["Enums"]["publication_job_status"]
          tenant_id: string
          updated_at: string
          variant_id: string
          version_id: string
        }
        Insert: {
          account_id: string
          attempts?: number
          created_at?: string
          id?: string
          idempotency_key: string
          last_error_code?: string | null
          last_error_message?: string | null
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number
          next_attempt_at?: string | null
          post_id: string
          priority?: number
          published_at?: string | null
          scheduled_at: string
          status?: Database["public"]["Enums"]["publication_job_status"]
          tenant_id: string
          updated_at?: string
          variant_id: string
          version_id: string
        }
        Update: {
          account_id?: string
          attempts?: number
          created_at?: string
          id?: string
          idempotency_key?: string
          last_error_code?: string | null
          last_error_message?: string | null
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number
          next_attempt_at?: string | null
          post_id?: string
          priority?: number
          published_at?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["publication_job_status"]
          tenant_id?: string
          updated_at?: string
          variant_id?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "publication_jobs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "social_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publication_jobs_account_tenant_fkey"
            columns: ["account_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "social_accounts"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "publication_jobs_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publication_jobs_post_tenant_fkey"
            columns: ["post_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "publication_jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publication_jobs_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "social_post_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publication_jobs_variant_post_tenant_fkey"
            columns: ["variant_id", "post_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "social_post_variants"
            referencedColumns: ["id", "post_id", "tenant_id"]
          },
          {
            foreignKeyName: "publication_jobs_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "content_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publication_jobs_version_post_tenant_fkey"
            columns: ["version_id", "post_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "content_versions"
            referencedColumns: ["id", "post_id", "tenant_id"]
          },
        ]
      }
      role_capabilities: {
        Row: {
          capability: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          capability: string
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          capability?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_capabilities_capability_fkey"
            columns: ["capability"]
            isOneToOne: false
            referencedRelation: "capabilities"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "role_capabilities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      social_accounts: {
        Row: {
          avatar_url: string | null
          capabilities: string[]
          created_at: string
          external_account_id: string
          id: string
          integration_id: string | null
          is_active: boolean
          metadata: Json
          name: string
          platform: Database["public"]["Enums"]["social_platform"]
          provider: string
          tenant_id: string
          token_expires_at: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          capabilities?: string[]
          created_at?: string
          external_account_id: string
          id?: string
          integration_id?: string | null
          is_active?: boolean
          metadata?: Json
          name: string
          platform: Database["public"]["Enums"]["social_platform"]
          provider: string
          tenant_id: string
          token_expires_at?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          capabilities?: string[]
          created_at?: string
          external_account_id?: string
          id?: string
          integration_id?: string | null
          is_active?: boolean
          metadata?: Json
          name?: string
          platform?: Database["public"]["Enums"]["social_platform"]
          provider?: string
          tenant_id?: string
          token_expires_at?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      social_approval_settings: {
        Row: {
          allow_no_approval_workflow: boolean
          created_at: string
          default_workflow_id: string | null
          requires_internal_review: boolean
          tenant_id: string
          updated_at: string
        }
        Insert: {
          allow_no_approval_workflow?: boolean
          created_at?: string
          default_workflow_id?: string | null
          requires_internal_review?: boolean
          tenant_id: string
          updated_at?: string
        }
        Update: {
          allow_no_approval_workflow?: boolean
          created_at?: string
          default_workflow_id?: string | null
          requires_internal_review?: boolean
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_approval_settings_default_workflow_id_fkey"
            columns: ["default_workflow_id"]
            isOneToOne: false
            referencedRelation: "social_approval_workflows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_approval_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      social_approval_stage_assignees: {
        Row: {
          assignee_type: string
          created_at: string
          id: string
          is_alternate: boolean
          role_id: string | null
          stage_id: string
          user_id: string | null
        }
        Insert: {
          assignee_type: string
          created_at?: string
          id?: string
          is_alternate?: boolean
          role_id?: string | null
          stage_id: string
          user_id?: string | null
        }
        Update: {
          assignee_type?: string
          created_at?: string
          id?: string
          is_alternate?: boolean
          role_id?: string | null
          stage_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_approval_stage_assignees_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "organization_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_approval_stage_assignees_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "social_approval_workflow_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      social_approval_workflow_stages: {
        Row: {
          allow_rejection: boolean
          allow_self_approval: boolean
          auto_advance: boolean
          created_at: string
          due_hours: number | null
          id: string
          minimum_approvals: number
          mode: Database["public"]["Enums"]["social_workflow_stage_mode"]
          name: string
          position: number
          require_comment_on_reject: boolean
          required_capability: string | null
          stage_type: Database["public"]["Enums"]["social_workflow_stage_type"]
          updated_at: string
          workflow_id: string
        }
        Insert: {
          allow_rejection?: boolean
          allow_self_approval?: boolean
          auto_advance?: boolean
          created_at?: string
          due_hours?: number | null
          id?: string
          minimum_approvals?: number
          mode?: Database["public"]["Enums"]["social_workflow_stage_mode"]
          name: string
          position: number
          require_comment_on_reject?: boolean
          required_capability?: string | null
          stage_type: Database["public"]["Enums"]["social_workflow_stage_type"]
          updated_at?: string
          workflow_id: string
        }
        Update: {
          allow_rejection?: boolean
          allow_self_approval?: boolean
          auto_advance?: boolean
          created_at?: string
          due_hours?: number | null
          id?: string
          minimum_approvals?: number
          mode?: Database["public"]["Enums"]["social_workflow_stage_mode"]
          name?: string
          position?: number
          require_comment_on_reject?: boolean
          required_capability?: string | null
          stage_type?: Database["public"]["Enums"]["social_workflow_stage_type"]
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_approval_workflow_stages_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "social_approval_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      social_approval_workflows: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          id: string
          is_active: boolean
          is_default: boolean
          is_system: boolean
          name: string
          organization_id: string | null
          slug: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          is_system?: boolean
          name: string
          organization_id?: string | null
          slug: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          is_system?: boolean
          name?: string
          organization_id?: string | null
          slug?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_approval_workflows_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_approval_workflows_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      social_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          parent_id: string | null
          post_id: string
          resolved_at: string | null
          resolved_by: string | null
          tenant_id: string
          updated_at: string
          version_id: string | null
          visibility: Database["public"]["Enums"]["social_comment_visibility"]
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          parent_id?: string | null
          post_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          tenant_id: string
          updated_at?: string
          version_id?: string | null
          visibility?: Database["public"]["Enums"]["social_comment_visibility"]
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          post_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          tenant_id?: string
          updated_at?: string
          version_id?: string | null
          visibility?: Database["public"]["Enums"]["social_comment_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "social_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "social_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_comments_parent_post_tenant_fkey"
            columns: ["parent_id", "post_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "social_comments"
            referencedColumns: ["id", "post_id", "tenant_id"]
          },
          {
            foreignKeyName: "social_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_comments_post_tenant_fkey"
            columns: ["post_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "social_comments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_comments_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "content_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_comments_version_post_tenant_fkey"
            columns: ["version_id", "post_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "content_versions"
            referencedColumns: ["id", "post_id", "tenant_id"]
          },
        ]
      }
      social_post_assets: {
        Row: {
          asset_id: string
          created_at: string
          id: string
          position: number
          post_id: string
          tenant_id: string
          updated_at: string
          variant_id: string | null
        }
        Insert: {
          asset_id: string
          created_at?: string
          id?: string
          position?: number
          post_id: string
          tenant_id: string
          updated_at?: string
          variant_id?: string | null
        }
        Update: {
          asset_id?: string
          created_at?: string
          id?: string
          position?: number
          post_id?: string
          tenant_id?: string
          updated_at?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_post_assets_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_post_assets_asset_tenant_fkey"
            columns: ["asset_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "social_post_assets_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_post_assets_post_tenant_fkey"
            columns: ["post_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "social_post_assets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_post_assets_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "social_post_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_post_assets_variant_post_tenant_fkey"
            columns: ["variant_id", "post_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "social_post_variants"
            referencedColumns: ["id", "post_id", "tenant_id"]
          },
        ]
      }
      social_post_variants: {
        Row: {
          account_id: string
          caption: string
          created_at: string
          external_container_id: string | null
          external_deletion_status: string | null
          external_media_id: string | null
          external_object_type: string | null
          external_permalink: string | null
          external_post_id: string | null
          external_post_url: string | null
          format: Database["public"]["Enums"]["social_post_format"]
          hashtags: string[]
          id: string
          link_url: string | null
          platform: Database["public"]["Enums"]["social_platform"]
          platform_config: Json
          post_id: string
          remote_identifiers: Json
          tenant_id: string
          updated_at: string
        }
        Insert: {
          account_id: string
          caption?: string
          created_at?: string
          external_container_id?: string | null
          external_deletion_status?: string | null
          external_media_id?: string | null
          external_object_type?: string | null
          external_permalink?: string | null
          external_post_id?: string | null
          external_post_url?: string | null
          format?: Database["public"]["Enums"]["social_post_format"]
          hashtags?: string[]
          id?: string
          link_url?: string | null
          platform: Database["public"]["Enums"]["social_platform"]
          platform_config?: Json
          post_id: string
          remote_identifiers?: Json
          tenant_id: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          caption?: string
          created_at?: string
          external_container_id?: string | null
          external_deletion_status?: string | null
          external_media_id?: string | null
          external_object_type?: string | null
          external_permalink?: string | null
          external_post_id?: string | null
          external_post_url?: string | null
          format?: Database["public"]["Enums"]["social_post_format"]
          hashtags?: string[]
          id?: string
          link_url?: string | null
          platform?: Database["public"]["Enums"]["social_platform"]
          platform_config?: Json
          post_id?: string
          remote_identifiers?: Json
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_post_variants_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "social_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_post_variants_account_tenant_fkey"
            columns: ["account_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "social_accounts"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "social_post_variants_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_post_variants_post_tenant_fkey"
            columns: ["post_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "social_post_variants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      social_posts: {
        Row: {
          approval_bypass_reason: string | null
          approval_bypassed: boolean
          approval_bypassed_at: string | null
          approval_bypassed_by: string | null
          approval_policy: string
          approved_version_id: string | null
          assigned_to: string | null
          content: string
          created_at: string
          created_by: string
          current_version: number
          deleted_at: string | null
          deleted_by: string | null
          deletion_locked_at: string | null
          deletion_locked_by: string | null
          deletion_mode:
            | Database["public"]["Enums"]["social_deletion_mode"]
            | null
          deletion_reason: string | null
          deletion_status: Database["public"]["Enums"]["social_deletion_status"]
          editorial_status: Database["public"]["Enums"]["social_editorial_status"]
          id: string
          metadata: Json
          minimum_approvals: number
          publication_status: Database["public"]["Enums"]["social_publication_status"]
          published_at: string | null
          remote_deletion_status: Database["public"]["Enums"]["social_remote_deletion_status"]
          scheduled_at: string | null
          status: Database["public"]["Enums"]["social_post_status"]
          tenant_id: string
          timezone: string
          title: string
          updated_at: string
          workflow_id: string | null
        }
        Insert: {
          approval_bypass_reason?: string | null
          approval_bypassed?: boolean
          approval_bypassed_at?: string | null
          approval_bypassed_by?: string | null
          approval_policy?: string
          approved_version_id?: string | null
          assigned_to?: string | null
          content?: string
          created_at?: string
          created_by: string
          current_version?: number
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_locked_at?: string | null
          deletion_locked_by?: string | null
          deletion_mode?:
            | Database["public"]["Enums"]["social_deletion_mode"]
            | null
          deletion_reason?: string | null
          deletion_status?: Database["public"]["Enums"]["social_deletion_status"]
          editorial_status?: Database["public"]["Enums"]["social_editorial_status"]
          id?: string
          metadata?: Json
          minimum_approvals?: number
          publication_status?: Database["public"]["Enums"]["social_publication_status"]
          published_at?: string | null
          remote_deletion_status?: Database["public"]["Enums"]["social_remote_deletion_status"]
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["social_post_status"]
          tenant_id: string
          timezone?: string
          title: string
          updated_at?: string
          workflow_id?: string | null
        }
        Update: {
          approval_bypass_reason?: string | null
          approval_bypassed?: boolean
          approval_bypassed_at?: string | null
          approval_bypassed_by?: string | null
          approval_policy?: string
          approved_version_id?: string | null
          assigned_to?: string | null
          content?: string
          created_at?: string
          created_by?: string
          current_version?: number
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_locked_at?: string | null
          deletion_locked_by?: string | null
          deletion_mode?:
            | Database["public"]["Enums"]["social_deletion_mode"]
            | null
          deletion_reason?: string | null
          deletion_status?: Database["public"]["Enums"]["social_deletion_status"]
          editorial_status?: Database["public"]["Enums"]["social_editorial_status"]
          id?: string
          metadata?: Json
          minimum_approvals?: number
          publication_status?: Database["public"]["Enums"]["social_publication_status"]
          published_at?: string | null
          remote_deletion_status?: Database["public"]["Enums"]["social_remote_deletion_status"]
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["social_post_status"]
          tenant_id?: string
          timezone?: string
          title?: string
          updated_at?: string
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_approved_version_fkey"
            columns: ["approved_version_id"]
            isOneToOne: false
            referencedRelation: "content_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_posts_approved_version_post_tenant_fkey"
            columns: ["approved_version_id", "id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "content_versions"
            referencedColumns: ["id", "post_id", "tenant_id"]
          },
          {
            foreignKeyName: "social_posts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_posts_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "social_approval_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      social_webhook_events: {
        Row: {
          attempts: number
          created_at: string
          external_event_id: string
          id: string
          payload: Json
          processed_at: string | null
          provider: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          external_event_id: string
          id?: string
          payload?: Json
          processed_at?: string | null
          provider: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          external_event_id?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          provider?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_webhook_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
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
      tenant_capability_grants: {
        Row: {
          allowed: boolean
          capability: string
          created_at: string
          granted_by: string | null
          id: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allowed?: boolean
          capability: string
          created_at?: string
          granted_by?: string | null
          id?: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          allowed?: boolean
          capability?: string
          created_at?: string
          granted_by?: string | null
          id?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_capability_grants_capability_fkey"
            columns: ["capability"]
            isOneToOne: false
            referencedRelation: "capabilities"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "tenant_capability_grants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "tenant_modules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      user_tenant_role: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_tenant_role_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_agent: {
        Row: {
          avatar: string | null
          created_at: string
          description: string | null
          handoff_rules: Json
          id: string
          is_active: boolean
          knowledge_base: Json
          llm_provider: string
          max_tokens: number
          model: string
          name: string
          system_prompt: string
          temperature: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          avatar?: string | null
          created_at?: string
          description?: string | null
          handoff_rules?: Json
          id?: string
          is_active?: boolean
          knowledge_base?: Json
          llm_provider?: string
          max_tokens?: number
          model?: string
          name: string
          system_prompt?: string
          temperature?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          avatar?: string | null
          created_at?: string
          description?: string | null
          handoff_rules?: Json
          id?: string
          is_active?: boolean
          knowledge_base?: Json
          llm_provider?: string
          max_tokens?: number
          model?: string
          name?: string
          system_prompt?: string
          temperature?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_agent_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_agent_session: {
        Row: {
          agent_id: string
          contact_id: string | null
          conversation_id: string | null
          created_at: string
          ended_at: string | null
          id: string
          messages_context: Json
          started_at: string
          status: string
          tenant_id: string
          tokens_used: number
          updated_at: string
        }
        Insert: {
          agent_id: string
          contact_id?: string | null
          conversation_id?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          messages_context?: Json
          started_at?: string
          status?: string
          tenant_id: string
          tokens_used?: number
          updated_at?: string
        }
        Update: {
          agent_id?: string
          contact_id?: string | null
          conversation_id?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          messages_context?: Json
          started_at?: string
          status?: string
          tenant_id?: string
          tokens_used?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_agent_session_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_agent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_agent_session_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_contact"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_agent_session_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_agent_session_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_agent_tool: {
        Row: {
          agent_id: string
          config: Json
          created_at: string
          id: string
          is_enabled: boolean
          mcp_server: string | null
          mcp_tool_name: string | null
          name: string
          tenant_id: string
          type: Database["public"]["Enums"]["whatsapp_agent_tool_type"]
          updated_at: string
        }
        Insert: {
          agent_id: string
          config?: Json
          created_at?: string
          id?: string
          is_enabled?: boolean
          mcp_server?: string | null
          mcp_tool_name?: string | null
          name: string
          tenant_id: string
          type?: Database["public"]["Enums"]["whatsapp_agent_tool_type"]
          updated_at?: string
        }
        Update: {
          agent_id?: string
          config?: Json
          created_at?: string
          id?: string
          is_enabled?: boolean
          mcp_server?: string | null
          mcp_tool_name?: string | null
          name?: string
          tenant_id?: string
          type?: Database["public"]["Enums"]["whatsapp_agent_tool_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_agent_tool_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_agent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_agent_tool_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_assignment: {
        Row: {
          assigned_at: string
          conversation_id: string
          created_at: string
          id: string
          tenant_id: string
          unassigned_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          conversation_id: string
          created_at?: string
          id?: string
          tenant_id: string
          unassigned_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          conversation_id?: string
          created_at?: string
          id?: string
          tenant_id?: string
          unassigned_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_assignment_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_assignment_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_campaign: {
        Row: {
          audience_filter: Json
          completed_at: string | null
          created_at: string
          id: string
          instance_id: string | null
          name: string
          scheduled_at: string | null
          started_at: string | null
          stats: Json
          status: Database["public"]["Enums"]["whatsapp_campaign_status"]
          template_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          audience_filter?: Json
          completed_at?: string | null
          created_at?: string
          id?: string
          instance_id?: string | null
          name: string
          scheduled_at?: string | null
          started_at?: string | null
          stats?: Json
          status?: Database["public"]["Enums"]["whatsapp_campaign_status"]
          template_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          audience_filter?: Json
          completed_at?: string | null
          created_at?: string
          id?: string
          instance_id?: string | null
          name?: string
          scheduled_at?: string | null
          started_at?: string | null
          stats?: Json
          status?: Database["public"]["Enums"]["whatsapp_campaign_status"]
          template_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_campaign_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_campaign_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_template"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_campaign_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_campaign_recipient: {
        Row: {
          campaign_id: string
          contact_id: string | null
          created_at: string
          error_message: string | null
          external_message_id: string | null
          id: string
          phone: string
          sent_at: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          campaign_id: string
          contact_id?: string | null
          created_at?: string
          error_message?: string | null
          external_message_id?: string | null
          id?: string
          phone: string
          sent_at?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          contact_id?: string | null
          created_at?: string
          error_message?: string | null
          external_message_id?: string | null
          id?: string
          phone?: string
          sent_at?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_campaign_recipient_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_campaign"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_campaign_recipient_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_contact"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_campaign_recipient_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_contact: {
        Row: {
          blocked: boolean
          created_at: string
          crm_contact_id: string | null
          custom_fields: Json
          id: string
          name: string | null
          opt_in: boolean
          opt_in_at: string | null
          phone: string
          profile_picture: string | null
          tags: string[]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          blocked?: boolean
          created_at?: string
          crm_contact_id?: string | null
          custom_fields?: Json
          id?: string
          name?: string | null
          opt_in?: boolean
          opt_in_at?: string | null
          phone: string
          profile_picture?: string | null
          tags?: string[]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          blocked?: boolean
          created_at?: string
          crm_contact_id?: string | null
          custom_fields?: Json
          id?: string
          name?: string | null
          opt_in?: boolean
          opt_in_at?: string | null
          phone?: string
          profile_picture?: string | null
          tags?: string[]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_contact_crm_contact_id_fkey"
            columns: ["crm_contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contact"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_contact_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_contact_tag: {
        Row: {
          contact_id: string
          created_at: string
          tag_id: string
          tenant_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          tag_id: string
          tenant_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          tag_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_contact_tag_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_contact"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_contact_tag_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_tag"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_contact_tag_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversation: {
        Row: {
          assigned_to: string | null
          channel: string
          contact_id: string | null
          contact_name: string
          contact_phone: string
          created_at: string
          crm_contact_id: string | null
          id: string
          instance_id: string | null
          is_online: boolean
          last_message_at: string | null
          last_message_preview: string
          lead_id: string | null
          priority: number
          profile_picture: string | null
          remote_jid: string
          status: Database["public"]["Enums"]["whatsapp_conversation_status"]
          tenant_id: string
          unread_count: number
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          channel?: string
          contact_id?: string | null
          contact_name: string
          contact_phone: string
          created_at?: string
          crm_contact_id?: string | null
          id?: string
          instance_id?: string | null
          is_online: boolean
          last_message_at?: string | null
          last_message_preview?: string
          lead_id?: string | null
          priority?: number
          profile_picture?: string | null
          remote_jid: string
          status?: Database["public"]["Enums"]["whatsapp_conversation_status"]
          tenant_id: string
          unread_count: number
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          channel?: string
          contact_id?: string | null
          contact_name?: string
          contact_phone?: string
          created_at?: string
          crm_contact_id?: string | null
          id?: string
          instance_id?: string | null
          is_online?: boolean
          last_message_at?: string | null
          last_message_preview?: string
          lead_id?: string | null
          priority?: number
          profile_picture?: string | null
          remote_jid?: string
          status?: Database["public"]["Enums"]["whatsapp_conversation_status"]
          tenant_id?: string
          unread_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_whatsapp_conversation_contact_id_fkey"
            columns: ["crm_contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contact"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_whatsapp_conversation_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_lead"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_whatsapp_conversation_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversation_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_contact"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversation_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instance"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversation_tag: {
        Row: {
          conversation_id: string
          created_at: string
          tag_id: string
          tenant_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          tag_id: string
          tenant_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          tag_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversation_tag_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversation_tag_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_tag"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversation_tag_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_flow: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          status: Database["public"]["Enums"]["whatsapp_flow_status"]
          tenant_id: string
          trigger_config: Json
          trigger_type: string
          updated_at: string
          version: number
          viewport: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          status?: Database["public"]["Enums"]["whatsapp_flow_status"]
          tenant_id: string
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string
          version?: number
          viewport?: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["whatsapp_flow_status"]
          tenant_id?: string
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string
          version?: number
          viewport?: Json
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_flow_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_flow_edge: {
        Row: {
          condition: Json
          created_at: string
          flow_id: string
          id: string
          source_handle: string | null
          source_node_id: string
          target_handle: string | null
          target_node_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          condition?: Json
          created_at?: string
          flow_id: string
          id?: string
          source_handle?: string | null
          source_node_id: string
          target_handle?: string | null
          target_node_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          condition?: Json
          created_at?: string
          flow_id?: string
          id?: string
          source_handle?: string | null
          source_node_id?: string
          target_handle?: string | null
          target_node_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_flow_edge_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_flow"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_flow_edge_source_node_id_fkey"
            columns: ["source_node_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_flow_node"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_flow_edge_target_node_id_fkey"
            columns: ["target_node_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_flow_node"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_flow_edge_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_flow_execution: {
        Row: {
          completed_at: string | null
          contact_id: string | null
          context: Json
          conversation_id: string | null
          created_at: string
          current_node_id: string | null
          flow_id: string
          id: string
          started_at: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          contact_id?: string | null
          context?: Json
          conversation_id?: string | null
          created_at?: string
          current_node_id?: string | null
          flow_id: string
          id?: string
          started_at?: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          contact_id?: string | null
          context?: Json
          conversation_id?: string | null
          created_at?: string
          current_node_id?: string | null
          flow_id?: string
          id?: string
          started_at?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_flow_execution_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_contact"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_flow_execution_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_flow_execution_current_node_id_fkey"
            columns: ["current_node_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_flow_node"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_flow_execution_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_flow"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_flow_execution_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_flow_execution_log: {
        Row: {
          action: string
          created_at: string
          error: string | null
          executed_at: string
          execution_id: string
          id: string
          input: Json
          node_id: string | null
          output: Json
          tenant_id: string
        }
        Insert: {
          action: string
          created_at?: string
          error?: string | null
          executed_at?: string
          execution_id: string
          id?: string
          input?: Json
          node_id?: string | null
          output?: Json
          tenant_id: string
        }
        Update: {
          action?: string
          created_at?: string
          error?: string | null
          executed_at?: string
          execution_id?: string
          id?: string
          input?: Json
          node_id?: string | null
          output?: Json
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_flow_execution_log_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_flow_execution"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_flow_execution_log_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_flow_node"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_flow_execution_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_flow_node: {
        Row: {
          created_at: string
          data: Json
          flow_id: string
          id: string
          label: string
          node_key: string
          position: Json
          tenant_id: string
          type: Database["public"]["Enums"]["whatsapp_flow_node_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json
          flow_id: string
          id?: string
          label?: string
          node_key: string
          position?: Json
          tenant_id: string
          type: Database["public"]["Enums"]["whatsapp_flow_node_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json
          flow_id?: string
          id?: string
          label?: string
          node_key?: string
          position?: Json
          tenant_id?: string
          type?: Database["public"]["Enums"]["whatsapp_flow_node_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_flow_node_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_flow"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_flow_node_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_instance: {
        Row: {
          connection_state: Json
          created_at: string
          id: string
          is_default: boolean
          metadata: Json
          name: string
          phone_number: string | null
          provider: Database["public"]["Enums"]["whatsapp_provider"]
          qr_code: string | null
          status: Database["public"]["Enums"]["whatsapp_instance_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          connection_state?: Json
          created_at?: string
          id?: string
          is_default?: boolean
          metadata?: Json
          name: string
          phone_number?: string | null
          provider?: Database["public"]["Enums"]["whatsapp_provider"]
          qr_code?: string | null
          status?: Database["public"]["Enums"]["whatsapp_instance_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          connection_state?: Json
          created_at?: string
          id?: string
          is_default?: boolean
          metadata?: Json
          name?: string
          phone_number?: string | null
          provider?: Database["public"]["Enums"]["whatsapp_provider"]
          qr_code?: string | null
          status?: Database["public"]["Enums"]["whatsapp_instance_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_instance_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_integration: {
        Row: {
          api_token_encrypted: string | null
          api_url: string | null
          cloud_access_token_encrypted: string | null
          cloud_business_id: string | null
          cloud_phone_id: string | null
          created_at: string
          id: string
          instance_id: string
          provider: Database["public"]["Enums"]["whatsapp_provider"]
          settings: Json
          tenant_id: string
          updated_at: string
          webhook_secret: string | null
        }
        Insert: {
          api_token_encrypted?: string | null
          api_url?: string | null
          cloud_access_token_encrypted?: string | null
          cloud_business_id?: string | null
          cloud_phone_id?: string | null
          created_at?: string
          id?: string
          instance_id: string
          provider: Database["public"]["Enums"]["whatsapp_provider"]
          settings?: Json
          tenant_id: string
          updated_at?: string
          webhook_secret?: string | null
        }
        Update: {
          api_token_encrypted?: string | null
          api_url?: string | null
          cloud_access_token_encrypted?: string | null
          cloud_business_id?: string | null
          cloud_phone_id?: string | null
          created_at?: string
          id?: string
          instance_id?: string
          provider?: Database["public"]["Enums"]["whatsapp_provider"]
          settings?: Json
          tenant_id?: string
          updated_at?: string
          webhook_secret?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_integration_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: true
            referencedRelation: "whatsapp_instance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_integration_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_message: {
        Row: {
          contact_id: string | null
          content: string
          conversation_id: string | null
          created_at: string
          crm_contact_id: string | null
          delivered_at: string | null
          external_id: string | null
          file_name: string | null
          from_me: boolean
          id: string
          instance_id: string
          lead_id: string | null
          media_mime: string | null
          media_url: string | null
          message_type: string
          metadata: Json
          read_at: string | null
          remote_jid: string
          reply_to_id: string | null
          sent_at: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          contact_id?: string | null
          content?: string
          conversation_id?: string | null
          created_at?: string
          crm_contact_id?: string | null
          delivered_at?: string | null
          external_id?: string | null
          file_name?: string | null
          from_me: boolean
          id?: string
          instance_id: string
          lead_id?: string | null
          media_mime?: string | null
          media_url?: string | null
          message_type: string
          metadata?: Json
          read_at?: string | null
          remote_jid: string
          reply_to_id?: string | null
          sent_at?: string | null
          status: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          contact_id?: string | null
          content?: string
          conversation_id?: string | null
          created_at?: string
          crm_contact_id?: string | null
          delivered_at?: string | null
          external_id?: string | null
          file_name?: string | null
          from_me?: boolean
          id?: string
          instance_id?: string
          lead_id?: string | null
          media_mime?: string | null
          media_url?: string | null
          message_type?: string
          metadata?: Json
          read_at?: string | null
          remote_jid?: string
          reply_to_id?: string | null
          sent_at?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_whatsapp_message_contact_id_fkey"
            columns: ["crm_contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contact"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_whatsapp_message_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_lead"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_whatsapp_message_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_message_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_contact"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_message_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_message_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_message"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_metric_daily: {
        Row: {
          agent_interactions: number
          avg_response_time_sec: number
          campaigns_sent: number
          conversations_opened: number
          conversations_resolved: number
          created_at: string
          date: string
          id: string
          instance_id: string | null
          messages_received: number
          messages_sent: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          agent_interactions?: number
          avg_response_time_sec?: number
          campaigns_sent?: number
          conversations_opened?: number
          conversations_resolved?: number
          created_at?: string
          date: string
          id?: string
          instance_id?: string | null
          messages_received?: number
          messages_sent?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          agent_interactions?: number
          avg_response_time_sec?: number
          campaigns_sent?: number
          conversations_opened?: number
          conversations_resolved?: number
          created_at?: string
          date?: string
          id?: string
          instance_id?: string | null
          messages_received?: number
          messages_sent?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_metric_daily_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_metric_daily_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_setting: {
        Row: {
          created_at: string
          id: string
          key: string
          tenant_id: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          tenant_id: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          tenant_id?: string
          updated_at?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_setting_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_tag: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_tag_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_template: {
        Row: {
          category: string | null
          components: Json
          created_at: string
          external_id: string | null
          id: string
          instance_id: string | null
          language: string
          name: string
          provider: Database["public"]["Enums"]["whatsapp_provider"] | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          components?: Json
          created_at?: string
          external_id?: string | null
          id?: string
          instance_id?: string | null
          language?: string
          name: string
          provider?: Database["public"]["Enums"]["whatsapp_provider"] | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          components?: Json
          created_at?: string
          external_id?: string | null
          id?: string
          instance_id?: string | null
          language?: string
          name?: string
          provider?: Database["public"]["Enums"]["whatsapp_provider"] | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_template_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_template_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_webhook_log: {
        Row: {
          created_at: string
          error: string | null
          event_type: string
          id: string
          instance_id: string | null
          payload: Json
          processed: boolean
          provider: Database["public"]["Enums"]["whatsapp_provider"] | null
          received_at: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          event_type: string
          id?: string
          instance_id?: string | null
          payload?: Json
          processed?: boolean
          provider?: Database["public"]["Enums"]["whatsapp_provider"] | null
          received_at?: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          error?: string | null
          event_type?: string
          id?: string
          instance_id?: string | null
          payload?: Json
          processed?: boolean
          provider?: Database["public"]["Enums"]["whatsapp_provider"] | null
          received_at?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_webhook_log_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_webhook_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
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
          p_role?: Database["public"]["Enums"]["app_role"]
          p_tenant_id: string
          p_user_id: string
        }
        Returns: string
      }
      assert_tenant_module_active: {
        Args: { p_module_name: string; p_tenant_id: string }
        Returns: undefined
      }
      change_user_role_in_tenant: {
        Args: {
          p_new_role: Database["public"]["Enums"]["app_role"]
          p_tenant_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      create_tenant_and_add_admin: {
        Args: { p_name: string; p_slug: string }
        Returns: string
      }
      is_tenant_module_active: {
        Args: { p_module_name: string; p_tenant_id: string }
        Returns: boolean
      }
      lock_approval_request: {
        Args: { p_actor_id: string; p_request_id: string }
        Returns: {
          created_at: string
          due_at: string | null
          id: string
          locked_at: string | null
          locked_by: string | null
          minimum_approvals: number
          next_approver_ids: string[] | null
          policy: string
          post_id: string
          requested_by: string
          resolved_at: string | null
          run_group_id: string
          run_status: Database["public"]["Enums"]["social_approval_run_status"]
          stage: Database["public"]["Enums"]["approval_stage"]
          stage_position: number | null
          status: Database["public"]["Enums"]["approval_status"]
          superseded_at: string | null
          tenant_id: string
          updated_at: string
          version_id: string
          workflow_id: string | null
          workflow_stage_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "approval_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      lock_social_post_for_deletion: {
        Args: {
          p_lock_ttl_seconds?: number
          p_locked_by: string
          p_post_id: string
          p_tenant_id: string
        }
        Returns: {
          approval_bypass_reason: string | null
          approval_bypassed: boolean
          approval_bypassed_at: string | null
          approval_bypassed_by: string | null
          approval_policy: string
          approved_version_id: string | null
          assigned_to: string | null
          content: string
          created_at: string
          created_by: string
          current_version: number
          deleted_at: string | null
          deleted_by: string | null
          deletion_locked_at: string | null
          deletion_locked_by: string | null
          deletion_mode:
            | Database["public"]["Enums"]["social_deletion_mode"]
            | null
          deletion_reason: string | null
          deletion_status: Database["public"]["Enums"]["social_deletion_status"]
          editorial_status: Database["public"]["Enums"]["social_editorial_status"]
          id: string
          metadata: Json
          minimum_approvals: number
          publication_status: Database["public"]["Enums"]["social_publication_status"]
          published_at: string | null
          remote_deletion_status: Database["public"]["Enums"]["social_remote_deletion_status"]
          scheduled_at: string | null
          status: Database["public"]["Enums"]["social_post_status"]
          tenant_id: string
          timezone: string
          title: string
          updated_at: string
          workflow_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "social_posts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      marketing_delete_social_post:
        | { Args: { p_post_id: string; p_tenant_id: string }; Returns: boolean }
        | {
            Args: {
              p_deleted_by?: string
              p_mode?: Database["public"]["Enums"]["social_deletion_mode"]
              p_post_id: string
              p_reason?: string
              p_remote_status?: Database["public"]["Enums"]["social_remote_deletion_status"]
              p_tenant_id: string
            }
            Returns: boolean
          }
      organization_owner_count: {
        Args: { p_organization_id: string }
        Returns: number
      }
      organization_serves_tenant: {
        Args: { p_organization_id: string; p_tenant_id: string }
        Returns: boolean
      }
      provision_agency_client: {
        Args: {
          p_actor_id: string
          p_display_name?: string
          p_internal_owner_user_id?: string
          p_logo_url?: string
          p_metadata?: Json
          p_modules?: string[]
          p_onboarding_id: string
          p_organization_id: string
          p_tenant_id?: string
          p_tenant_name?: string
          p_tenant_slug?: string
        }
        Returns: string
      }
      remove_user_from_tenant: {
        Args: { p_tenant_id: string; p_user_id: string }
        Returns: boolean
      }
      user_can_manage_organization: {
        Args: { p_organization_id: string }
        Returns: boolean
      }
      user_can_manage_tenant_team: {
        Args: { p_tenant_id: string }
        Returns: boolean
      }
      user_has_tenant_access: {
        Args: { p_tenant_id: string }
        Returns: boolean
      }
      user_has_tenant_capability: {
        Args: { p_capability: string; p_tenant_id: string }
        Returns: boolean
      }
    }
    Enums: {
      agency_onboarding_status:
        | "draft"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "failed"
      app_role: "admin" | "cliente" | "funcionario" | "atendente"
      approval_change_category:
        | "art"
        | "copy"
        | "date"
        | "platform"
        | "incorrect_info"
        | "other"
      approval_stage: "internal" | "client"
      approval_status:
        | "pending"
        | "approved"
        | "changes_requested"
        | "cancelled"
        | "rejected"
      crm_lead_priority: "low" | "medium" | "high"
      crm_lead_source:
        | "website"
        | "referral"
        | "social"
        | "email"
        | "phone"
        | "other"
      crm_lead_status:
        | "new"
        | "contacted"
        | "qualified"
        | "proposal"
        | "negotiation"
        | "won"
        | "lost"
      crm_meeting_status: "scheduled" | "completed" | "cancelled" | "no-show"
      crm_meeting_type: "call" | "video" | "in-person" | "demo"
      deletion_job_status:
        | "pending"
        | "processing"
        | "done"
        | "failed"
        | "deleted"
        | "already_absent"
        | "unsupported"
        | "manual_action_required"
        | "skipped"
      media_asset_purpose: "reference" | "publication"
      organization_relationship_type: "owner" | "managed"
      organization_type: "platform" | "agency" | "direct"
      publication_job_status:
        | "pending"
        | "processing"
        | "retrying"
        | "published"
        | "failed"
        | "cancelled"
      publish_status: "published" | "draft" | "arquived" | "scheduled"
      social_approval_run_status:
        | "pending"
        | "approved"
        | "changes_requested"
        | "rejected"
        | "cancelled"
        | "superseded"
      social_comment_visibility: "internal" | "shared"
      social_deletion_mode:
        | "cancel_draft"
        | "system_and_remote"
        | "system_only"
        | "retry_remote"
      social_deletion_status:
        | "none"
        | "requested"
        | "remote_in_progress"
        | "remote_partial"
        | "completed"
        | "failed"
        | "cancelled"
      social_editorial_status:
        | "draft"
        | "internal_review"
        | "client_review"
        | "changes_requested"
        | "approved"
        | "rejected"
        | "cancelled"
      social_platform: "facebook" | "instagram" | "linkedin"
      social_post_format: "static" | "carousel" | "video" | "story"
      social_post_status:
        | "draft"
        | "pending_approval"
        | "changes_requested"
        | "approved"
        | "scheduled"
        | "publishing"
        | "published"
        | "failed"
        | "archived"
      social_publication_status:
        | "not_scheduled"
        | "scheduled"
        | "publishing"
        | "published"
        | "partially_published"
        | "failed"
        | "deletion_pending"
        | "deleted"
      social_remote_deletion_status:
        | "not_applicable"
        | "pending"
        | "in_progress"
        | "completed"
        | "partial"
        | "failed"
        | "manual_action_required"
        | "skipped"
      social_workflow_stage_mode: "any" | "all" | "minimum"
      social_workflow_stage_type: "internal" | "client" | "custom"
      whatsapp_agent_tool_type: "mcp" | "internal" | "api"
      whatsapp_campaign_status:
        | "draft"
        | "scheduled"
        | "running"
        | "paused"
        | "completed"
        | "failed"
      whatsapp_conversation_status: "open" | "pending" | "resolved" | "spam"
      whatsapp_flow_node_type:
        | "trigger"
        | "message"
        | "condition"
        | "delay"
        | "action"
        | "ai_agent"
        | "handoff"
        | "webhook"
        | "tag"
        | "crm_update"
      whatsapp_flow_status: "draft" | "active" | "paused" | "archived"
      whatsapp_instance_status:
        | "disconnected"
        | "connecting"
        | "connected"
        | "error"
      whatsapp_message_status:
        | "pending"
        | "sent"
        | "delivered"
        | "read"
        | "failed"
      whatsapp_message_type:
        | "text"
        | "image"
        | "audio"
        | "video"
        | "document"
        | "sticker"
        | "location"
        | "template"
        | "interactive"
      whatsapp_provider: "evolution" | "cloud_api"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      agency_onboarding_status: [
        "draft",
        "in_progress",
        "completed",
        "cancelled",
        "failed",
      ],
      app_role: ["admin", "cliente", "funcionario", "atendente"],
      approval_change_category: [
        "art",
        "copy",
        "date",
        "platform",
        "incorrect_info",
        "other",
      ],
      approval_stage: ["internal", "client"],
      approval_status: [
        "pending",
        "approved",
        "changes_requested",
        "cancelled",
        "rejected",
      ],
      crm_lead_priority: ["low", "medium", "high"],
      crm_lead_source: [
        "website",
        "referral",
        "social",
        "email",
        "phone",
        "other",
      ],
      crm_lead_status: [
        "new",
        "contacted",
        "qualified",
        "proposal",
        "negotiation",
        "won",
        "lost",
      ],
      crm_meeting_status: ["scheduled", "completed", "cancelled", "no-show"],
      crm_meeting_type: ["call", "video", "in-person", "demo"],
      deletion_job_status: [
        "pending",
        "processing",
        "done",
        "failed",
        "deleted",
        "already_absent",
        "unsupported",
        "manual_action_required",
        "skipped",
      ],
      media_asset_purpose: ["reference", "publication"],
      organization_relationship_type: ["owner", "managed"],
      organization_type: ["platform", "agency", "direct"],
      publication_job_status: [
        "pending",
        "processing",
        "retrying",
        "published",
        "failed",
        "cancelled",
      ],
      publish_status: ["published", "draft", "arquived", "scheduled"],
      social_approval_run_status: [
        "pending",
        "approved",
        "changes_requested",
        "rejected",
        "cancelled",
        "superseded",
      ],
      social_comment_visibility: ["internal", "shared"],
      social_deletion_mode: [
        "cancel_draft",
        "system_and_remote",
        "system_only",
        "retry_remote",
      ],
      social_deletion_status: [
        "none",
        "requested",
        "remote_in_progress",
        "remote_partial",
        "completed",
        "failed",
        "cancelled",
      ],
      social_editorial_status: [
        "draft",
        "internal_review",
        "client_review",
        "changes_requested",
        "approved",
        "rejected",
        "cancelled",
      ],
      social_platform: ["facebook", "instagram", "linkedin"],
      social_post_format: ["static", "carousel", "video", "story"],
      social_post_status: [
        "draft",
        "pending_approval",
        "changes_requested",
        "approved",
        "scheduled",
        "publishing",
        "published",
        "failed",
        "archived",
      ],
      social_publication_status: [
        "not_scheduled",
        "scheduled",
        "publishing",
        "published",
        "partially_published",
        "failed",
        "deletion_pending",
        "deleted",
      ],
      social_remote_deletion_status: [
        "not_applicable",
        "pending",
        "in_progress",
        "completed",
        "partial",
        "failed",
        "manual_action_required",
        "skipped",
      ],
      social_workflow_stage_mode: ["any", "all", "minimum"],
      social_workflow_stage_type: ["internal", "client", "custom"],
      whatsapp_agent_tool_type: ["mcp", "internal", "api"],
      whatsapp_campaign_status: [
        "draft",
        "scheduled",
        "running",
        "paused",
        "completed",
        "failed",
      ],
      whatsapp_conversation_status: ["open", "pending", "resolved", "spam"],
      whatsapp_flow_node_type: [
        "trigger",
        "message",
        "condition",
        "delay",
        "action",
        "ai_agent",
        "handoff",
        "webhook",
        "tag",
        "crm_update",
      ],
      whatsapp_flow_status: ["draft", "active", "paused", "archived"],
      whatsapp_instance_status: [
        "disconnected",
        "connecting",
        "connected",
        "error",
      ],
      whatsapp_message_status: [
        "pending",
        "sent",
        "delivered",
        "read",
        "failed",
      ],
      whatsapp_message_type: [
        "text",
        "image",
        "audio",
        "video",
        "document",
        "sticker",
        "location",
        "template",
        "interactive",
      ],
      whatsapp_provider: ["evolution", "cloud_api"],
    },
  },
} as const
