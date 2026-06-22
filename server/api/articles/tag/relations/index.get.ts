import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

import { defineEventHandler, getQuery } from 'h3'

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
  const query = getQuery(event)
  const { article_id } = query

  if (isStaffRole(role)) {
    let supabaseQuery = client.from('articles_tag_relations').select('*')
    if (article_id)
      supabaseQuery = supabaseQuery.eq('article_id', article_id)
    const { data, error } = await supabaseQuery
    if (error)
      return { status: 400, message: error.message }
    return data
  }

  if (tenantId) {
    let supabaseQuery = client.from('articles_tag_relations').select('*').eq('tenant_id', tenantId)
    if (article_id)
      supabaseQuery = supabaseQuery.eq('article_id', article_id)
    const { data, error } = await supabaseQuery
    if (error)
      return { status: 400, message: error.message }
    return data
  }

  return { status: 403, message: 'Forbidden' }
})
