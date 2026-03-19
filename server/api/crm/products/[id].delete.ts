import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

import { defineEventHandler, getQuery } from 'h3'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user)
    return { status: 401, message: 'Unauthorized' }

  const id = getRouterParam(event, 'id')
  const query = getQuery(event)
  const tenant_id = query.tenant_id as string

  if (!id)
    return { status: 400, message: 'ID is required' }
  if (!tenant_id)
    return { status: 400, message: 'Tenant ID is required' }

  const client = await serverSupabaseServiceRole(event)
  const { data, error } = await client
    .from('crm_products')
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tenant_id)
    .select()
    .single()

  if (error)
    return { status: 400, message: error.message }
  if (!data)
    return { status: 404, message: 'Product not found' }
  return { success: true, data }
})
