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
  const effectiveTenantId = (query.tenant_id as string) || tenantId

  if (!effectiveTenantId)
    throw createError({ statusCode: 400, statusMessage: 'Tenant ID is required' })

  if (!canAccessTenantModule(role))
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  if (isWrongTenantForScopedUser(role, tenantId, effectiveTenantId))
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  const client = await serverSupabaseServiceRole(event)
  const { data, error } = await client
    .from('crm_products_category')
    .select('*')
    .eq('tenant_id', effectiveTenantId)
    .order('name', { ascending: true })

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  return data ?? []
})
