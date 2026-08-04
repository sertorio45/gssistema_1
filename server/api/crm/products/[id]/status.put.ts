import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'

/** Soft-toggle product active flag (deactivate / reactivate). */
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const id = getRouterParam(event, 'id')
  const body = await readBody(event) as { tenant_id?: string, active?: boolean }

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID is required' })
  }
  if (!body?.tenant_id) {
    throw createError({ statusCode: 400, statusMessage: 'Tenant ID is required' })
  }
  if (typeof body.active !== 'boolean') {
    throw createError({ statusCode: 400, statusMessage: 'active (boolean) is required' })
  }

  const client = serverSupabaseServiceRole(event)
  const { data, error } = await client
    .from('crm_products')
    .update({ active: body.active, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', body.tenant_id)
    .select()
    .maybeSingle()

  if (error) {
    throw createError({ statusCode: 400, statusMessage: error.message })
  }
  if (!data) {
    throw createError({ statusCode: 404, statusMessage: 'Produto não encontrado' })
  }

  return { success: true, data }
})
