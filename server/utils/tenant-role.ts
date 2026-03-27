/**
 * Role helpers aligned with workspace rules: admin/funcionario have access to any tenant;
 * cliente is scoped to tenant_roles / metadata.
 */

export function isStaffUser(user: { app_metadata?: any, user_metadata?: any }): boolean {
  const gr = user.user_metadata?.role || user.app_metadata?.role
  if (gr === 'admin' || gr === 'funcionario')
    return true
  const tr = user.app_metadata?.tenant_roles || {}
  return Object.values(tr).some(r => r === 'admin' || r === 'funcionario')
}

export function resolveStaffRole(user: { app_metadata?: any, user_metadata?: any }): 'admin' | 'funcionario' {
  const gr = user.user_metadata?.role || user.app_metadata?.role
  if (gr === 'admin' || gr === 'funcionario')
    return gr
  const tr = user.app_metadata?.tenant_roles || {}
  if (Object.values(tr).includes('admin'))
    return 'admin'
  return 'funcionario'
}
