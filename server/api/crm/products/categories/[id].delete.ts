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
    return { status: 401, message: 'Unauthorized' }

  const id = getRouterParam(event, 'id')
  if (!id)
    return { status: 400, message: 'ID is required' }

  const query = getQuery(event)
  const { role, tenantId } = resolveTenantApiAuth(user, event.context.auth?.tenantId)
  const requestedTenantId = (query.tenant_id as string) || tenantId

  if (!requestedTenantId)
    return { status: 400, message: 'Tenant ID is required' }

  if (!canAccessTenantModule(role))
    return { status: 403, message: 'Forbidden' }

  if (isWrongTenantForScopedUser(role, tenantId, requestedTenantId))
    return { status: 403, message: 'Forbidden' }

  const client = await serverSupabaseServiceRole(event)
  const { error } = await client
    .from('crm_products_category')
    .delete()
    .eq('id', id)
    .eq('tenant_id', requestedTenantId)

  if (error)
    return { status: 400, message: error.message }
  return { success: true }
})
