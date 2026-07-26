import type { WorkspaceCapability } from '~/constants/workspace'

import type { WorkspaceClient, WorkspaceModule } from '~/server/utils/workspace-context'
import { isStaffRole } from '~/constants/roles'
import {
  ALL_WORKSPACE_CAPABILITIES,
  expandCapabilityAliases,
  holdsCapability,

} from '~/constants/workspace'

export interface ResolveCapabilitiesInput {
  client: WorkspaceClient
  userId: string
  organizationId?: string | null
  tenantId?: string | null
  /** When already known, skips a membership lookup. */
  organizationRoleId?: string | null
  /** Global role from app_metadata — never from the client. */
  globalRole?: string | null
  isPlatformStaff?: boolean
  /** Modules already resolved for the tenant; empty means "do not filter". */
  modules?: WorkspaceModule[] | null
  /** When true and a tenant is present, drop marketing caps if marketing is not contracted. */
  enforceModules?: boolean
}

export interface ResolvedCapabilities {
  capabilities: WorkspaceCapability[]
  source: 'platform' | 'organization_role' | 'legacy_app_role' | 'empty'
  roleId: string | null
  denied: string[]
}

const MARKETING_PREFIX = 'marketing.social.'

/**
 * Single source of truth for effective capabilities.
 *
 * Order:
 * 1. platform privileges
 * 2. active organization membership + cargo
 * 3. tenant assignment (caller must have validated reach already)
 * 4. cargo capabilities
 * 5. per-user overrides (deny wins)
 * 6. module gate
 */
export async function resolveEffectiveCapabilities(
  input: ResolveCapabilitiesInput,
): Promise<ResolvedCapabilities> {
  const isPlatformStaff = input.isPlatformStaff
    ?? isStaffRole(input.globalRole)

  if (isPlatformStaff) {
    return {
      capabilities: [...ALL_WORKSPACE_CAPABILITIES],
      source: 'platform',
      roleId: null,
      denied: [],
    }
  }

  let roleId = input.organizationRoleId ?? null
  let legacyRole: string | null = null

  if (!roleId && input.organizationId) {
    const { data: membership } = await input.client
      .from('organization_memberships')
      .select('role_id, role, is_active')
      .eq('organization_id', input.organizationId)
      .eq('user_id', input.userId)
      .eq('is_active', true)
      .maybeSingle()

    if (membership) {
      roleId = membership.role_id ? String(membership.role_id) : null
      legacyRole = membership.role ? String(membership.role) : null
    }
  }

  const granted = new Set<string>()
  let source: ResolvedCapabilities['source'] = 'empty'

  if (roleId) {
    const { data: rows } = await input.client
      .from('organization_role_capabilities')
      .select('capability, allowed')
      .eq('role_id', roleId)

    for (const row of rows || []) {
      if (row.allowed)
        granted.add(String(row.capability))
    }
    source = 'organization_role'
  }
  else if (legacyRole) {
    const { data: rows } = await input.client
      .from('role_capabilities')
      .select('capability, tenant_id')
      .eq('role', legacyRole)

    for (const row of rows || []) {
      const scopedTenantId = row.tenant_id ? String(row.tenant_id) : null
      if (scopedTenantId && scopedTenantId !== input.tenantId)
        continue
      granted.add(String(row.capability))
    }
    source = 'legacy_app_role'
  }

  const denied: string[] = []

  if (input.tenantId) {
    const { data: overrides } = await input.client
      .from('tenant_capability_grants')
      .select('capability, allowed')
      .eq('tenant_id', input.tenantId)
      .eq('user_id', input.userId)

    for (const row of overrides || []) {
      const capability = String(row.capability)
      if (row.allowed) {
        granted.add(capability)
      }
      else {
        granted.delete(capability)
        denied.push(capability)
        for (const alias of expandCapabilityAliases([capability])) {
          if (alias !== capability) {
            granted.delete(alias)
            denied.push(alias)
          }
        }
      }
    }
  }

  if (input.enforceModules !== false && input.tenantId && input.modules) {
    const hasMarketing = input.modules.includes('marketing')
    if (!hasMarketing) {
      for (const capability of [...granted]) {
        if (capability.startsWith(MARKETING_PREFIX))
          granted.delete(capability)
      }
    }
  }

  const expanded = expandCapabilityAliases(granted)
  for (const capability of denied)
    expanded.delete(capability)

  const capabilities = ALL_WORKSPACE_CAPABILITIES.filter(capability => expanded.has(capability))

  return { capabilities, source, roleId, denied: [...new Set(denied)] }
}

export function capabilitySetHas(
  capabilities: Iterable<string>,
  required: WorkspaceCapability | WorkspaceCapability[],
): boolean {
  const list = Array.isArray(required) ? required : [required]
  return list.every(capability => holdsCapability(capabilities, capability))
}
