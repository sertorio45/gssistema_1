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
  role: string
  is_active: boolean
  access_all_tenants: boolean
  created_at: string
  updated_at: string
  tenants: OrganizationMemberTenantAssignment[]
}
