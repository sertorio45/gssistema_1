import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

import { defineEventHandler, getQuery, getRouterParam } from 'h3'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    return { status: 401, message: 'Unauthorized' }
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    return { status: 400, message: 'Missing pipeline id' }
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

  const { tenant_id: queryTenantId } = getQuery(event)
  const effectiveTenantId = (queryTenantId as string) || tenantId

  if (!effectiveTenantId) {
    return { status: 400, message: 'Tenant ID is required' }
  }

  if (role === 'cliente' && effectiveTenantId !== tenantId) {
    return { status: 403, message: 'Forbidden' }
  }

  const client = await serverSupabaseServiceRole(event)
  const { data, error } = await client
    .from('crm_pipeline')
    .select('*')
    .eq('id', id)
    .or(`is_default.eq.true,tenant_id.eq.${effectiveTenantId}`)
    .single()

  if (error || !data) {
    return { status: 404, message: 'Pipeline not found' }
  }

  return data
})
