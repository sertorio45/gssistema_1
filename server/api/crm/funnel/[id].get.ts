import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

import { defineEventHandler, getQuery, getRouterParam } from 'h3'

import {
  canAccessTenantModule,
  isWrongTenantForScopedUser,
  resolveTenantApiAuth,
} from '~/server/utils/tenant-access'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user)
    return { status: 401, message: 'Não autorizado' }

  const id = getRouterParam(event, 'id')
  if (!id)
    return { status: 400, message: 'ID do funil é obrigatório' }

  const { role, tenantId } = resolveTenantApiAuth(user, event.context.auth?.tenantId)
  const { tenant_id: queryTenantId } = getQuery(event)
  const effectiveTenantId = (queryTenantId as string) || tenantId

  if (!effectiveTenantId)
    return { status: 400, message: 'Tenant ID é obrigatório' }

  if (!canAccessTenantModule(role))
    return { status: 403, message: 'Acesso negado' }

  if (isWrongTenantForScopedUser(role, tenantId, effectiveTenantId))
    return { status: 403, message: 'Acesso negado' }

  const client = await serverSupabaseServiceRole(event)

  const { data, error } = await client
    .from('crm_funnel')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error)
    return { status: 400, message: error.message }

  if (!data)
    return { status: 404, message: 'Funil não encontrado' }

  return data
})
