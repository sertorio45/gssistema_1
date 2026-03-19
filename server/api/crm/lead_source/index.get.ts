import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { defineEventHandler, getQuery } from 'h3'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)

  if (!user) {
    return { status: 401, message: 'Unauthorized' }
  }

  const tenantRoles = user.app_metadata?.tenant_roles || {}
  let tenantId = event.context.auth?.tenantId

  if (!tenantId) {
    const firstTenant = Object.keys(tenantRoles)[0]

    if (firstTenant) {
      tenantId = firstTenant
    }
  }

  let role = null

  if (tenantId && tenantRoles[tenantId]) {
    role = tenantRoles[tenantId]
  }
  else {
    role = user.user_metadata?.role || user.app_metadata?.role
  }

  const client = await serverSupabaseServiceRole(event)
  const { tenant_id } = getQuery(event)

  // Se tenant_id for passado na query, usar ele (para admin/funcionario)
  const queryTenantId = tenant_id ? String(tenant_id) : tenantId

  if (!queryTenantId) {
    return { status: 400, message: 'Tenant ID is required' }
  }

  if (role === 'cliente' && queryTenantId !== tenantId) {
    return { status: 403, message: 'Forbidden' }
  }

  if (role === 'admin' || role === 'funcionario' || role === 'cliente') {
    const { data, error } = await client
      .from('crm_lead_source_table')
      .select('*')
      .or(`is_default.eq.true,tenant_id.eq.${queryTenantId}`)
      .order('name')

    if (error) {
      return { status: 400, message: error.message }
    }

    return data
  }
  else {
    return { status: 403, message: 'Forbidden' }
  }
})
