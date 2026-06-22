import { createError } from 'h3'

import { isStaffRole, isTenantScopedRole } from '~/constants/roles'
import { isStaffUser, resolveStaffRole } from '~/server/utils/tenant-role'

type AuthUser = {
  app_metadata?: { role?: string, tenant_roles?: Record<string, string>, tenant_id?: string }
  user_metadata?: { role?: string, tenant_id?: string }
}

export function resolveUserTenantId(
  user: AuthUser,
  contextTenantId?: string | null,
): string | null {
  const tenantRoles = user.app_metadata?.tenant_roles || {}
  let tenantId = contextTenantId || null

  if (!tenantId) {
    const keys = Object.keys(tenantRoles)
    if (keys.length)
      tenantId = keys[0]
  }

  if (!tenantId) {
    tenantId = user.user_metadata?.tenant_id
      || user.app_metadata?.tenant_id
      || null
  }

  return tenantId
}

export function resolveApiUserRole(user: AuthUser, tenantId?: string | null): string | null {
  if (isStaffUser(user))
    return resolveStaffRole(user)

  const tenantRoles = user.app_metadata?.tenant_roles || {}

  if (tenantId && tenantRoles[tenantId])
    return tenantRoles[tenantId]

  const keys = Object.keys(tenantRoles)
  if (!tenantId && keys.length === 1)
    return tenantRoles[keys[0]] ?? null

  return user.user_metadata?.role || user.app_metadata?.role || null
}

export function canAccessTenantModule(role?: string | null): boolean {
  return isStaffRole(role) || role === 'cliente' || role === 'atendente'
}

export function isWrongTenantForScopedUser(
  role: string | null,
  userTenantId: string | null,
  requestedTenantId: string,
): boolean {
  return isTenantScopedRole(role)
    && !!userTenantId
    && requestedTenantId !== userTenantId
}

export function assertTenantModuleAccess(role: string | null) {
  if (!canAccessTenantModule(role))
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
}

export function assertScopedTenantAccess(
  role: string | null,
  userTenantId: string | null,
  requestedTenantId: string,
) {
  if (isWrongTenantForScopedUser(role, userTenantId, requestedTenantId))
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
}

export function resolveTenantApiAuth(
  user: AuthUser,
  contextTenantId?: string | null,
) {
  const tenantId = resolveUserTenantId(user, contextTenantId)
  const role = resolveApiUserRole(user, tenantId)
  return { role, tenantId }
}
