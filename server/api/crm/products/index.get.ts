import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

import { createError, defineEventHandler, getQuery } from 'h3'

import {
  canAccessTenantModule,
  isWrongTenantForScopedUser,
  resolveTenantApiAuth,
} from '~/server/utils/tenant-access'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user)
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const { role, tenantId } = resolveTenantApiAuth(user, event.context.auth?.tenantId)
  const query = getQuery(event)
  const { tenant_id: queryTenantId, type, category_id, active } = query
  const effectiveTenantId = (queryTenantId as string) || tenantId

  if (!effectiveTenantId)
    throw createError({ statusCode: 400, statusMessage: 'Tenant ID is required' })

  if (!canAccessTenantModule(role))
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  if (isWrongTenantForScopedUser(role, tenantId, effectiveTenantId))
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  const client = await serverSupabaseServiceRole(event)
  let req = client
    .from('crm_products')
    .select('*, crm_products_category(name)')
    .eq('tenant_id', effectiveTenantId)
    .order('created_at', { ascending: false })

  if (type === 'recorrente' || type === 'avulso')
    req = req.eq('type', type)
  if (category_id != null && String(category_id).trim() !== '')
    req = req.eq('category_id', String(category_id).trim())
  if (active === 'true' || active === 'false')
    req = req.eq('active', active === 'true')

  const { data, error } = await req
  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  const rows = (data ?? []) as Array<Record<string, unknown> & { crm_products_category?: { name: string } | null }>
  return rows.map(p => ({
    ...p,
    category: p.crm_products_category?.name ?? null,
    crm_products_category: undefined,
  }))
})
