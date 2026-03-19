import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { defineEventHandler, getRouterParam, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user)
    return { status: 401, message: 'Unauthorized' }

  const id = getRouterParam(event, 'id')
  if (!id)
    return { status: 400, message: 'ID is required' }

  const body = await readBody(event) as { tenant_id: string; name: string }
  if (!body.tenant_id)
    return { status: 400, message: 'Tenant ID is required' }
  if (!body.name || String(body.name).trim() === '')
    return { status: 400, message: 'Name is required' }

  const tenantRoles = user.app_metadata?.tenant_roles || {}
  const tenantId = event.context.auth?.tenantId as string | undefined
  const role = tenantId && tenantRoles[tenantId]
    ? tenantRoles[tenantId]
    : (user.user_metadata?.role as string) || (user.app_metadata?.role as string)

  if (role === 'cliente' && body.tenant_id !== tenantId)
    return { status: 403, message: 'Forbidden' }

  const client = await serverSupabaseServiceRole(event)
  const { data, error } = await client
    .from('crm_products_category')
    .update({ name: body.name.trim(), updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', body.tenant_id)
    .select()
    .single()

  if (error)
    return { status: 400, message: error.message }
  if (!data)
    return { status: 404, message: 'Category not found' }
  return data
})
