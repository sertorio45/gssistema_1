import { createError, readBody } from 'h3'

import {
  assertCanManageTenantTeam,
  assertRoleAssignable,
  updateTenantTeamMember,
  type TenantTeamRole,
} from '~/server/utils/tenant-team'
import { serverSupabaseServiceRole } from '#supabase/server'

interface UpdateTeamMemberBody {
  tenant_id?: string
  name?: string
  role?: TenantTeamRole
  password?: string
}

export default defineEventHandler(async (event) => {
  const membershipId = getRouterParam(event, 'id')
  if (!membershipId)
    throw createError({ statusCode: 400, statusMessage: 'id is required' })

  const body = await readBody<UpdateTeamMemberBody>(event)
  const tenantId = String(body.tenant_id || '').trim()
  if (!tenantId)
    throw createError({ statusCode: 400, statusMessage: 'tenant_id is required' })

  const { isStaff, role: managerRole } = await assertCanManageTenantTeam(event, tenantId)
  if (body.role)
    assertRoleAssignable(isStaff, managerRole, body.role)

  const client = serverSupabaseServiceRole(event)
  const member = await updateTenantTeamMember(client, {
    tenantId,
    membershipId,
    name: body.name,
    role: body.role,
    password: body.password,
  })

  return { data: member }
})
