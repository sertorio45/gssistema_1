/**
 * Slugs de role no banco (enum app_role). Labels são apenas para UI.
 */
export type AppRoleSlug = 'admin' | 'funcionario' | 'cliente' | 'atendente'

export const STAFF_ROLES: AppRoleSlug[] = ['admin', 'funcionario']
export const TENANT_SCOPED_ROLES: AppRoleSlug[] = ['cliente', 'atendente']
/** Staff managing tenant team via /settings/team */
export const TENANT_TEAM_STAFF_ASSIGNABLE_ROLES: AppRoleSlug[] = ['cliente', 'atendente']
/** Tenant owner (Administrador) may only create atendentes */
export const TENANT_TEAM_CLIENT_ASSIGNABLE_ROLES: AppRoleSlug[] = ['atendente']

/** Rótulos exibidos na interface (português). */
export const ROLE_LABELS: Record<AppRoleSlug, string> = {
  admin: 'Superadministrador',
  funcionario: 'Funcionário',
  cliente: 'Administrador',
  atendente: 'Atendente',
}

export function isStaffRole(role?: string | null): boolean {
  return role === 'admin' || role === 'funcionario'
}

export function isTenantScopedRole(role?: string | null): boolean {
  return role === 'cliente' || role === 'atendente'
}

export function isGlobalStaffFromJwt(payload: {
  app_metadata?: { role?: string, tenant_roles?: Record<string, string> }
  user_metadata?: { role?: string }
}): boolean {
  const globalRole = payload.app_metadata?.role || payload.user_metadata?.role
  return isStaffRole(globalRole)
}
