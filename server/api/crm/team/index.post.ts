import type { TenantTeamRole } from '~/server/utils/tenant-team'

import { serverSupabaseServiceRole } from '#supabase/server'
import { createError, readBody } from 'h3'
import { resolveAuthRedirectOrigin } from '~/server/utils/auth-invite'
import {
  assertCanManageTenantTeam,
  assertRoleAssignable,
  createTenantTeamMember,
  inviteTenantTeamMember,

} from '~/server/utils/tenant-team'

/** `password`: admin sets it now · `invite`: member defines it from the e-mail. */
type CreateMode = 'password' | 'invite'

interface CreateTeamMemberBody {
  tenant_id?: string
  email?: string
  password?: string
  name?: string
  role?: TenantTeamRole
  mode?: CreateMode
}

export default defineEventHandler(async (event) => {
  const body = await readBody<CreateTeamMemberBody>(event)
  const tenantId = String(body.tenant_id || '').trim()
  const email = String(body.email || '').trim()
  const password = String(body.password || '')
  const name = String(body.name || '').trim()
  const role = (body.role || 'atendente') as TenantTeamRole
  const mode: CreateMode = body.mode === 'invite' ? 'invite' : 'password'

  if (!tenantId || !email || !name)
    throw createError({ statusCode: 400, statusMessage: 'tenant_id, email e name são obrigatórios' })

  if (mode === 'password' && password.length < 8)
    throw createError({ statusCode: 400, statusMessage: 'A senha deve ter pelo menos 8 caracteres' })

  const { isStaff, role: managerRole } = await assertCanManageTenantTeam(event, tenantId)
  assertRoleAssignable(isStaff, managerRole, role)

  const client = serverSupabaseServiceRole(event)

  if (mode === 'invite') {
    const result = await inviteTenantTeamMember(client, {
      tenantId,
      email,
      name,
      role,
      redirectTo: `${resolveAuthRedirectOrigin(event)}/confirm?flow=invite`,
    })

    return {
      data: result.member,
      invite: {
        email_sent: result.emailSent,
        existing_user: result.existingUser,
        action_link: result.actionLink,
      },
    }
  }

  const member = await createTenantTeamMember(client, {
    tenantId,
    email,
    password,
    name,
    role,
  })

  return { data: member }
})
