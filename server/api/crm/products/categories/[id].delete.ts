import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { createError, defineEventHandler, getQuery, getRouterParam } from 'h3'
import {
  canAccessTenantModule,
  isWrongTenantForScopedUser,
  resolveTenantApiAuth,
} from '~/server/utils/tenant-access'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Não autorizado' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID é obrigatório' })
  }

  const query = getQuery(event)
  const { role, tenantId } = resolveTenantApiAuth(user, event.context.auth?.tenantId)
  const requestedTenantId = (query.tenant_id as string) || tenantId

  if (!requestedTenantId) {
    throw createError({ statusCode: 400, statusMessage: 'Tenant ID é obrigatório' })
  }

  if (!canAccessTenantModule(role)) {
    throw createError({ statusCode: 403, statusMessage: 'Acesso negado' })
  }

  if (isWrongTenantForScopedUser(role, tenantId, requestedTenantId)) {
    throw createError({ statusCode: 403, statusMessage: 'Acesso negado' })
  }

  const client = serverSupabaseServiceRole(event)
  const { data: deleted, error } = await client
    .from('crm_products_category')
    .delete()
    .eq('id', id)
    .eq('tenant_id', requestedTenantId)
    .select('id')
    .maybeSingle()

  if (error) {
    throw createError({ statusCode: 400, statusMessage: error.message })
  }

  if (!deleted) {
    throw createError({ statusCode: 404, statusMessage: 'Categoria não encontrada' })
  }

  return { success: true }
})
