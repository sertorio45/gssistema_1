import { isStaffRole } from '~/constants/roles'

/**
 * Staff da plataforma: apenas role global em app_metadata (Superadministrador / Funcionário).
 * Roles em tenant_roles (Administrador / Atendente) nunca equivalem a staff.
 */
export function isStaffUser(user: { app_metadata?: any, user_metadata?: any }): boolean {
  return isStaffRole(resolveGlobalRole(user))
}

export function resolveGlobalRole(user: { app_metadata?: any, user_metadata?: any }): string | null {
  return user.app_metadata?.role
    || user.user_metadata?.role
    || null
}

export function resolveStaffRole(user: { app_metadata?: any, user_metadata?: any }): 'admin' | 'funcionario' {
  const globalRole = resolveGlobalRole(user)
  if (globalRole === 'admin' || globalRole === 'funcionario')
    return globalRole
  return 'funcionario'
}
