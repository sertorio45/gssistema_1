import { createError, getQuery } from 'h3'

import { resolveMarketingTenantContext } from '~/server/utils/marketing'
import {
  assertCanManageTenantTeam,
  listAttendantMembers,
  listTenantTeamMembers,
} from '~/server/utils/tenant-team'
import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const tenantId = String(query.tenant_id || '').trim()
  if (!tenantId)
    throw createError({ statusCode: 400, statusMessage: 'tenant_id is required' })

  const attendantsOnly = query.attendants_only === 'true'

  if (attendantsOnly)
    await resolveMarketingTenantContext(event, tenantId)
  else
    await assertCanManageTenantTeam(event, tenantId)

  const client = serverSupabaseServiceRole(event)
  const members = await listTenantTeamMembers(client, tenantId)

  return {
    data: attendantsOnly ? listAttendantMembers(members) : members,
  }
})
