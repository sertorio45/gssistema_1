import type {
  OrganizationRelationshipType,
  OrganizationType,
  WorkspaceCapability,
} from '~/constants/workspace'

export interface WorkspaceContextOrganization {
  id: string
  name: string
  slug: string
  type: OrganizationType
  is_active: boolean
  anchor_tenant_id: string | null
}

export interface WorkspaceContextTenant {
  id: string
  name: string
  slug: string
  is_active: boolean
  organization_id?: string | null
  relationship_type?: OrganizationRelationshipType | null
}

/** Payload of `GET /api/workspace/context`. Rendering hint only. */
export interface WorkspaceContextResponse {
  user: { id: string, email: string | null }
  global_role: string | null
  is_platform_staff: boolean
  organization: WorkspaceContextOrganization | null
  organization_role: string | null
  organization_role_id: string | null
  organization_role_slug: string | null
  organization_role_name: string | null
  organization_relationship_type: OrganizationRelationshipType | null
  tenant: { id: string, name: string, slug: string, is_active: boolean } | null
  tenant_role: string | null
  effective_role: string | null
  capabilities: WorkspaceCapability[]
  modules: string[]
  can_access_all_organization_tenants: boolean
  requestedContextRejected: boolean
  organizations: WorkspaceContextOrganization[]
  tenants: WorkspaceContextTenant[]
}

export interface OrganizationMemberTenantAssignment {
  organization_membership_id: string
  tenant_id: string
  is_active: boolean
  tenant?: { id: string, name: string, slug: string } | null
}

export interface OrganizationMember {
  id: string
  user_id: string
  email?: string | null
  last_sign_in_at?: string | null
  role: string
  role_id?: string | null
  role_name?: string | null
  role_slug?: string | null
  organization_role?: {
    id: string
    name: string
    slug: string
    is_protected: boolean
    is_system: boolean
  } | null
  is_active: boolean
  access_all_tenants: boolean
  created_at: string
  updated_at: string
  tenants: OrganizationMemberTenantAssignment[]
}

export interface OrganizationRole {
  id: string
  organization_id: string | null
  name: string
  slug: string
  description: string
  organization_type: OrganizationType | null
  is_system: boolean
  is_default: boolean
  is_editable: boolean
  is_protected: boolean
  legacy_app_role: string
  member_count?: number
  capabilities?: Array<{ capability: string, allowed: boolean }>
  created_at: string
  updated_at: string
}

export interface AgencyDashboardMetrics {
  active_clients: number
  pending_social_integrations: number
  pending_internal_reviews: number
  pending_client_reviews: number
  changes_requested: number
  approved_awaiting_schedule: number
  publication_errors: number
  overdue_approvals: number
  assigned_tasks: number
  upcoming_scheduled_posts: number
  scope_tenant_count: number
}

export interface AgencyClientRow {
  link_id: string
  tenant_id: string
  name: string
  logo_url: string | null
  tenant: { name: string, slug: string, is_active: boolean }
  status: 'active' | 'inactive'
  modules: string[]
  internal_owner: { user_id: string, email: string | null } | null
  client_user_count: number
  client_invite_emails: string[]
  connected_networks: Array<{ platform: string, name: string | null, username: string | null }>
  posts_pending_approval: number
  posts_scheduled: number
  recent_failures: number
  started_at: string | null
}

export interface AgencyBranding {
  commercial_name: string | null
  logo_url: string | null
  primary_color: string | null
  custom_domain: string | null
  invite_display_name: string | null
  notification_signature: string | null
}

export interface AgencyOnboarding {
  id: string
  organization_id: string
  tenant_id: string | null
  status: 'draft' | 'in_progress' | 'completed' | 'cancelled' | 'failed'
  current_step: string
  payload: Record<string, unknown>
  error_message: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
}
