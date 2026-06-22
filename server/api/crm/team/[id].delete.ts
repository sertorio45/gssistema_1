import { createError, getQuery } from 'h3'

import { assertCanManageTenantTeam, removeTenantTeamMember } from '~/server/utils/tenant-team'
import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const membershipId = getRouterParam(event, 'id')
  if (!membershipId)
    throw createError({ statusCode: 400, statusMessage: 'id is required' })

  const query = getQuery(event)
  const tenantId = String(query.tenant_id || '').trim()
  if (!tenantId)
    throw createError({ statusCode: 400, statusMessage: 'tenant_id is required' })

  const { user } = await assertCanManageTenantTeam(event, tenantId)
  const client = serverSupabaseServiceRole(event)

  await removeTenantTeamMember(client, tenantId, membershipId, user.id)

  return { ok: true }
})
