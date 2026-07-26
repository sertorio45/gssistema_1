import type { WorkspaceContext } from '~/server/utils/workspace-context'

/**
 * Shape sent to the browser. It carries no secret and is treated by the client
 * as a hint for rendering only — every request is authorized again server-side.
 */
export interface SerializedWorkspaceContext {
  user: { id: string, email: string | null }
  global_role: string | null
  is_platform_staff: boolean
  organization: {
    id: string
    name: string
    slug: string
    type: string
    is_active: boolean
    anchor_tenant_id: string | null
  } | null
  organization_role: string | null
  organization_role_id: string | null
  organization_role_slug: string | null
  organization_role_name: string | null
  organization_relationship_type: string | null
  tenant: {
    id: string
    name: string
    slug: string
    is_active: boolean
  } | null
  tenant_role: string | null
  effective_role: string | null
  capabilities: string[]
  modules: string[]
  can_access_all_organization_tenants: boolean
}

export function serializeWorkspaceContext(context: WorkspaceContext): SerializedWorkspaceContext {
  return {
    user: {
      id: context.userId,
      email: context.user.email ?? null,
    },
    global_role: context.globalRole,
    is_platform_staff: context.isPlatformStaff,
    organization: context.organization
      ? {
          id: context.organization.id,
          name: context.organization.name,
          slug: context.organization.slug,
          type: context.organization.type,
          is_active: context.organization.isActive,
          anchor_tenant_id: context.organization.anchorTenantId,
        }
      : null,
    organization_role: context.organizationRole,
    organization_role_id: context.organizationRoleId,
    organization_role_slug: context.organizationRoleSlug,
    organization_role_name: context.organizationRoleName,
    organization_relationship_type: context.organizationTenantLink?.relationshipType ?? null,
    tenant: context.tenant
      ? {
          id: context.tenant.id,
          name: context.tenant.name,
          slug: context.tenant.slug,
          is_active: context.tenant.isActive,
        }
      : null,
    tenant_role: context.tenantRole,
    effective_role: context.effectiveRole,
    capabilities: context.capabilities,
    modules: context.modules,
    can_access_all_organization_tenants: context.canAccessAllOrganizationTenants,
  }
}
