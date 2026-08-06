import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

import { defineEventHandler, getQuery } from 'h3'

import {
  canAccessTenantModule,
  isWrongTenantForScopedUser,
  resolveTenantApiAuth,
} from '~/server/utils/tenant-access'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)

  if (!user)
    return { status: 401, message: 'Não autorizado' }

  const { role, tenantId } = resolveTenantApiAuth(user, event.context.auth?.tenantId)
  const client = await serverSupabaseServiceRole(event)
  const { tenant_id: queryTenantId } = getQuery(event)
  const effectiveTenantId = (queryTenantId as string) || tenantId

  if (!effectiveTenantId)
    return { status: 400, message: 'Tenant ID é obrigatório' }

  if (!canAccessTenantModule(role))
    return { status: 403, message: 'Acesso negado' }

  if (isWrongTenantForScopedUser(role, tenantId, effectiveTenantId))
    return { status: 403, message: 'Acesso negado' }

  const { data, error } = await client
    .from('crm_funnel')
    .select('*')
    .or(`is_default.eq.true,tenant_id.eq.${effectiveTenantId}`)
    .order('name')

  if (error)
    return { status: 400, message: error.message }

  return data
})
