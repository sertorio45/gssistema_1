import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { createError, defineEventHandler, getQuery, getRouterParam } from 'h3'

/** Hard-delete product permanently. */
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Não autorizado' })
  }

  const id = getRouterParam(event, 'id')
  const query = getQuery(event)
  const tenant_id = String(query.tenant_id || '')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID é obrigatório' })
  }
  if (!tenant_id) {
    throw createError({ statusCode: 400, statusMessage: 'Tenant ID é obrigatório' })
  }

  const client = serverSupabaseServiceRole(event)
  const { data: deleted, error } = await client
    .from('crm_products')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenant_id)
    .select('id')
    .maybeSingle()

  if (error) {
    throw createError({ statusCode: 400, statusMessage: error.message })
  }
  if (!deleted) {
    throw createError({ statusCode: 404, statusMessage: 'Produto não encontrado' })
  }

  return { success: true }
})
