import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { defineEventHandler, getQuery } from 'h3'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user)
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const tenantRoles = user.app_metadata?.tenant_roles || {}
  let tenantId = event.context.auth?.tenantId as string | undefined
  if (!tenantId) {
    const firstTenant = Object.keys(tenantRoles)[0]
    if (firstTenant)
      tenantId = firstTenant
  }

  const query = getQuery(event)
  const effectiveTenantId = (query.tenant_id as string) || tenantId
  if (!effectiveTenantId)
    throw createError({ statusCode: 400, statusMessage: 'Tenant ID is required' })

  const role = tenantId && tenantRoles[tenantId]
    ? tenantRoles[tenantId]
    : (user.user_metadata?.role as string) || (user.app_metadata?.role as string)

  if (role === 'cliente' && effectiveTenantId !== tenantId)
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  const client = await serverSupabaseServiceRole(event)
  const { data, error } = await client
    .from('crm_products_category')
    .select('*')
    .eq('tenant_id', effectiveTenantId)
    .order('name', { ascending: true })

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  return data ?? []
})
