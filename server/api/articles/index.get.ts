import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

import { defineEventHandler } from 'h3'

import { isStaffRole } from '~/constants/roles'
import {
  canAccessTenantModule,
  resolveTenantApiAuth,
} from '~/server/utils/tenant-access'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user)
    return { status: 401, message: 'Unauthorized' }

  const { role, tenantId } = resolveTenantApiAuth(user, event.context.auth?.tenantId)

  if (!canAccessTenantModule(role))
    return { status: 403, message: 'Forbidden' }

  const client = await serverSupabaseServiceRole(event)

  if (isStaffRole(role)) {
    const { data, error } = await client.from('articles').select('*')
    if (error)
      return { status: 400, message: error.message }
    return data
  }

  if (tenantId) {
    const { data, error } = await client.from('articles').select('*').eq('tenant_id', tenantId)
    if (error)
      return { status: 400, message: error.message }
    return data
  }

  return { status: 403, message: 'Forbidden' }
})
