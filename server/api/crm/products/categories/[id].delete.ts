import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { defineEventHandler, getQuery, getRouterParam } from 'h3'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user)
    return { status: 401, message: 'Unauthorized' }

  const id = getRouterParam(event, 'id')
  if (!id)
    return { status: 400, message: 'ID is required' }

  const query = getQuery(event)
  const tenantId = (query.tenant_id as string) || (event.context.auth?.tenantId as string)
  if (!tenantId)
    return { status: 400, message: 'Tenant ID is required' }

  const tenantRoles = user.app_metadata?.tenant_roles || {}
  const role = tenantId && tenantRoles[tenantId]
    ? tenantRoles[tenantId]
    : (user.user_metadata?.role as string) || (user.app_metadata?.role as string)

  if (role === 'cliente' && tenantId !== event.context.auth?.tenantId)
    return { status: 403, message: 'Forbidden' }

  const client = await serverSupabaseServiceRole(event)
  const { error } = await client
    .from('crm_products_category')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error)
    return { status: 400, message: error.message }
  return { success: true }
})
