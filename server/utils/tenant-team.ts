import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@supabase/supabase-js'
import { createError } from 'h3'

import { resolveMarketingTenantContext } from '~/server/utils/marketing'
import { isStaffUser, resolveStaffRole } from '~/server/utils/tenant-role'

export type TenantTeamRole = 'atendente' | 'cliente' | 'funcionario' | 'admin'

export interface TenantTeamMember {
  id: string
  userId: string
  tenantId: string
  role: TenantTeamRole
  email: string
  name: string
  createdAt: string
  updatedAt: string
}

const CLIENT_ASSIGNABLE_ROLES: TenantTeamRole[] = ['atendente']
const STAFF_ASSIGNABLE_ROLES: TenantTeamRole[] = ['atendente', 'cliente']

function getAdminClient() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function assertCanManageTenantTeam(event: any, tenantId: string) {
  const { user, role } = await resolveMarketingTenantContext(event, tenantId)

  if (isStaffUser(user) || role === 'admin' || role === 'funcionario' || role === 'cliente')
    return { user, role: role as string, isStaff: isStaffUser(user) }

  throw createError({ statusCode: 403, statusMessage: 'Sem permissão para gerenciar a equipe' })
}

export function resolveAssignableRoles(isStaff: boolean, managerRole: string): TenantTeamRole[] {
  if (isStaff || managerRole === 'admin' || managerRole === 'funcionario')
    return STAFF_ASSIGNABLE_ROLES

  if (managerRole === 'cliente')
    return CLIENT_ASSIGNABLE_ROLES

  return []
}

export function assertRoleAssignable(isStaff: boolean, managerRole: string, targetRole: TenantTeamRole) {
  const allowed = resolveAssignableRoles(isStaff, managerRole)
  if (!allowed.includes(targetRole)) {
    throw createError({
      statusCode: 400,
      statusMessage: `Role "${targetRole}" não pode ser atribuída por este usuário`,
    })
  }
}

export async function syncUserTenantRolesMetadata(userId: string) {
  const admin = getAdminClient()
  const { data: rows, error } = await admin
    .from('user_tenant_role')
    .select('tenant_id, role')
    .eq('user_id', userId)

  if (error)
    throw new Error(error.message)

  const tenantRoles: Record<string, string> = {}
  for (const row of rows || []) {
    if (row.tenant_id)
      tenantRoles[row.tenant_id as string] = row.role as string
  }

  const { data: existing } = await admin.auth.admin.getUserById(userId)
  const currentMeta = existing.user?.app_metadata || {}

  await admin.auth.admin.updateUserById(userId, {
    app_metadata: {
      ...currentMeta,
      tenant_roles: tenantRoles,
    },
  })
}

async function mapAuthUserToMember(
  roleRow: {
    id: string
    user_id: string
    tenant_id: string | null
    role: string
    created_at: string
    updated_at: string
  },
  authUser: { email?: string, user_metadata?: Record<string, unknown> } | null,
): Promise<TenantTeamMember> {
  return {
    id: roleRow.id,
    userId: roleRow.user_id,
    tenantId: roleRow.tenant_id as string,
    role: roleRow.role as TenantTeamRole,
    email: authUser?.email || '',
    name: String(authUser?.user_metadata?.name || authUser?.email || 'Usuário'),
    createdAt: roleRow.created_at,
    updatedAt: roleRow.updated_at,
  }
}

export async function listTenantTeamMembers(
  client: SupabaseClient,
  tenantId: string,
): Promise<TenantTeamMember[]> {
  const { data: roleRows, error } = await client
    .from('user_tenant_role')
    .select('id, user_id, tenant_id, role, created_at, updated_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true })

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  const admin = getAdminClient()
  const members: TenantTeamMember[] = []

  for (const row of roleRows || []) {
    const { data: authData } = await admin.auth.admin.getUserById(row.user_id as string)
    members.push(await mapAuthUserToMember(row, authData.user))
  }

  return members
}

export async function createTenantTeamMember(
  client: SupabaseClient,
  params: {
    tenantId: string
    email: string
    password: string
    name: string
    role: TenantTeamRole
  },
): Promise<TenantTeamMember> {
  const admin = getAdminClient()

  const { data: createdUser, error: createUserError } = await admin.auth.admin.createUser({
    email: params.email.trim(),
    password: params.password,
    email_confirm: true,
    user_metadata: {
      name: params.name.trim(),
      tenant_id: params.tenantId,
    },
  })

  if (createUserError || !createdUser.user)
    throw createError({ statusCode: 400, statusMessage: createUserError?.message || 'Failed to create user' })

  const userId = createdUser.user.id

  const { data: roleRow, error: roleError } = await client
    .from('user_tenant_role')
    .insert({
      user_id: userId,
      tenant_id: params.tenantId,
      role: params.role,
    })
    .select('id, user_id, tenant_id, role, created_at, updated_at')
    .single()

  if (roleError) {
    await admin.auth.admin.deleteUser(userId)
    throw createError({ statusCode: 400, statusMessage: roleError.message })
  }

  await syncUserTenantRolesMetadata(userId)

  return mapAuthUserToMember(roleRow, createdUser.user)
}

export async function updateTenantTeamMember(
  client: SupabaseClient,
  params: {
    tenantId: string
    membershipId: string
    name?: string
    role?: TenantTeamRole
    password?: string
  },
): Promise<TenantTeamMember> {
  const admin = getAdminClient()

  const { data: roleRow, error: fetchError } = await client
    .from('user_tenant_role')
    .select('id, user_id, tenant_id, role, created_at, updated_at')
    .eq('id', params.membershipId)
    .eq('tenant_id', params.tenantId)
    .maybeSingle()

  if (fetchError || !roleRow)
    throw createError({ statusCode: 404, statusMessage: 'Membro não encontrado' })

  if (params.role) {
    const { error: updateRoleError } = await client
      .from('user_tenant_role')
      .update({ role: params.role, updated_at: new Date().toISOString() })
      .eq('id', params.membershipId)
      .eq('tenant_id', params.tenantId)

    if (updateRoleError)
      throw createError({ statusCode: 400, statusMessage: updateRoleError.message })

    roleRow.role = params.role
  }

  const authUpdate: { password?: string, user_metadata?: Record<string, unknown> } = {}
  if (params.password)
    authUpdate.password = params.password
  if (params.name?.trim())
    authUpdate.user_metadata = { name: params.name.trim(), tenant_id: params.tenantId }

  if (Object.keys(authUpdate).length) {
    const { error: authError } = await admin.auth.admin.updateUserById(roleRow.user_id as string, authUpdate)
    if (authError)
      throw createError({ statusCode: 400, statusMessage: authError.message })
  }

  await syncUserTenantRolesMetadata(roleRow.user_id as string)

  const { data: authData } = await admin.auth.admin.getUserById(roleRow.user_id as string)
  return mapAuthUserToMember(roleRow, authData.user)
}

export async function removeTenantTeamMember(
  client: SupabaseClient,
  tenantId: string,
  membershipId: string,
  currentUserId: string,
) {
  const admin = getAdminClient()

  const { data: roleRow, error: fetchError } = await client
    .from('user_tenant_role')
    .select('id, user_id')
    .eq('id', membershipId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (fetchError || !roleRow)
    throw createError({ statusCode: 404, statusMessage: 'Membro não encontrado' })

  if (roleRow.user_id === currentUserId)
    throw createError({ statusCode: 400, statusMessage: 'Você não pode remover a si mesmo' })

  const { error: deleteRoleError } = await client
    .from('user_tenant_role')
    .delete()
    .eq('id', membershipId)
    .eq('tenant_id', tenantId)

  if (deleteRoleError)
    throw createError({ statusCode: 400, statusMessage: deleteRoleError.message })

  const { data: remaining } = await client
    .from('user_tenant_role')
    .select('id')
    .eq('user_id', roleRow.user_id as string)
    .limit(1)

  if (!remaining?.length)
    await admin.auth.admin.deleteUser(roleRow.user_id as string)
  else
    await syncUserTenantRolesMetadata(roleRow.user_id as string)
}

export function listAttendantMembers(members: TenantTeamMember[]) {
  return members.filter(member => ['atendente', 'cliente'].includes(member.role))
}
