import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

import { defineEventHandler, getRouterParam } from 'h3'

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
  const articleId = getRouterParam(event, 'id')
  if (!articleId)
    return { status: 400, message: 'Article ID not provided' }

  if (isStaffRole(role)) {
    const { data, error } = await client.from('articles_tag_relations').select('*').eq('id', articleId)
    if (error)
      return { status: 400, message: error.message }
    return data
  }

  if (tenantId) {
    const { data, error } = await client
      .from('articles_tag_relations')
      .select('*')
      .eq('id', articleId)
      .eq('tenant_id', tenantId)
    if (error)
      return { status: 400, message: error.message }
    return data
  }

  return { status: 403, message: 'Forbidden' }
})
