import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

import { defineEventHandler, getRouterParam, readBody } from 'h3'

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
    return { status: 400, message: 'ID é obrigatório' }

  const body = await readBody(event) as { tenant_id: string, name: string }
  if (!body.tenant_id)
    return { status: 400, message: 'Tenant ID é obrigatório' }
  if (!body.name || String(body.name).trim() === '')
    return { status: 400, message: 'Nome é obrigatório' }

  const { role, tenantId } = resolveTenantApiAuth(user, event.context.auth?.tenantId)

  if (!canAccessTenantModule(role))
    return { status: 403, message: 'Acesso negado' }

  if (isWrongTenantForScopedUser(role, tenantId, body.tenant_id))
    return { status: 403, message: 'Acesso negado' }

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
    return { status: 404, message: 'Categoria não encontrada' }
  return data
})
