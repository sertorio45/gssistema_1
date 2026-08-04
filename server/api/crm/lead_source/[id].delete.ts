import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { isWrongTenantForScopedUser, resolveTenantApiAuth } from '~/server/utils/tenant-access'
import { createError, defineEventHandler, getQuery, getRouterParam } from 'h3'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const id = getRouterParam(event, 'id')
  const query = getQuery(event)
  const requestedTenantId = String(query.tenant_id || '')
  const { tenantId, role } = resolveTenantApiAuth(user, event.context.auth?.tenantId)

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID é obrigatório' })
  }

  const client = serverSupabaseServiceRole(event)

  const { data: leadSource, error: findError } = await client
    .from('crm_lead_source_table')
    .select('id, tenant_id')
    .eq('id', id)
    .maybeSingle()

  if (findError) {
    throw createError({ statusCode: 400, statusMessage: findError.message })
  }

  if (!leadSource) {
    throw createError({ statusCode: 404, statusMessage: 'Origem não encontrada' })
  }

  if (isWrongTenantForScopedUser(role, tenantId, leadSource.tenant_id)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  if (requestedTenantId && requestedTenantId !== leadSource.tenant_id) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const { data: deleted, error } = await client
    .from('crm_lead_source_table')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle()

  if (error) {
    throw createError({ statusCode: 400, statusMessage: error.message })
  }

  if (!deleted) {
    throw createError({ statusCode: 404, statusMessage: 'Origem não encontrada' })
  }

  return { success: true }
})
