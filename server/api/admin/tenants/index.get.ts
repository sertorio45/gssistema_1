import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

import { resolveTenantModuleSlugs, TENANT_MODULE_BUNDLE_ALL } from '~/constants/modules'
import { isStaffRole } from '~/constants/roles'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user)
    throw createError({ statusCode: 401, statusMessage: 'Não autenticado' })

  const globalRole = (user.app_metadata as { role?: string })?.role
    || (user.user_metadata as { role?: string })?.role

  if (!isStaffRole(globalRole))
    throw createError({ statusCode: 403, statusMessage: 'Acesso negado' })

  const client = await serverSupabaseServiceRole(event)

  const { data, error } = await client
    .from('tenant')
    .select('id, name, slug, is_active, created_at, updated_at')
    .order('name')

  if (error)
    throw createError({ statusCode: 500, statusMessage: error.message })

  const tenants = data || []
  const tenantIds = tenants.map((row: { id: string }) => row.id)
  const activeNamesByTenant = new Map<string, string[]>()

  if (tenantIds.length) {
    const { data: moduleRows, error: modulesError } = await client
      .from('tenant_modules')
      .select('tenant_id, module_name, is_active')
      .in('tenant_id', tenantIds)
      .eq('is_active', true)

    if (modulesError)
      throw createError({ statusCode: 500, statusMessage: modulesError.message })

    for (const row of moduleRows || []) {
      const tenantId = String(row.tenant_id)
      const list = activeNamesByTenant.get(tenantId) || []
      list.push(String(row.module_name))
      activeNamesByTenant.set(tenantId, list)
    }
  }

  return {
    tenants: tenants.map((tenant: { id: string }) => {
      const activeNames = activeNamesByTenant.get(tenant.id) || []
      return {
        ...tenant,
        modules: resolveTenantModuleSlugs(activeNames),
        hasAllBundle: activeNames.includes(TENANT_MODULE_BUNDLE_ALL),
      }
    }),
  }
})
