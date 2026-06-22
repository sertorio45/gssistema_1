import { createError, readBody } from 'h3'

import {
  assertCanManageTenantTeam,
  assertRoleAssignable,
  createTenantTeamMember,
  type TenantTeamRole,
} from '~/server/utils/tenant-team'
import { serverSupabaseServiceRole } from '#supabase/server'

interface CreateTeamMemberBody {
  tenant_id?: string
  email?: string
  password?: string
  name?: string
  role?: TenantTeamRole
}

export default defineEventHandler(async (event) => {
  const body = await readBody<CreateTeamMemberBody>(event)
  const tenantId = String(body.tenant_id || '').trim()
  const email = String(body.email || '').trim()
  const password = String(body.password || '')
  const name = String(body.name || '').trim()
  const role = (body.role || 'atendente') as TenantTeamRole

  if (!tenantId || !email || !password || !name)
    throw createError({ statusCode: 400, statusMessage: 'tenant_id, email, password e name são obrigatórios' })

  const { isStaff, role: managerRole } = await assertCanManageTenantTeam(event, tenantId)
  assertRoleAssignable(isStaff, managerRole, role)

  const client = serverSupabaseServiceRole(event)
  const member = await createTenantTeamMember(client, {
    tenantId,
    email,
    password,
    name,
    role,
  })

  return { data: member }
})
