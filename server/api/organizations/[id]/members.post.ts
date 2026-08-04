import { getRouterParam, readBody } from 'h3'
import { z } from 'zod'

import { inviteOrLinkAuthUserByEmail, resolveAuthRedirectOrigin } from '~/server/utils/auth-invite'
import { recordAuditEvent } from '~/server/utils/audit-events'
import {
  assertAssignableCapabilities,
  assertMembershipRoleChange,
  loadOrganizationRole,
} from '~/server/utils/organization-roles'
import { requireWorkspaceContext } from '~/server/utils/workspace-context'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

const schema = z.object({
  email: z.string().email().optional(),
  userId: z.string().uuid().optional(),
  roleId: z.string().uuid(),
  accessAllTenants: z.boolean().default(true),
  tenantIds: z.array(z.string().uuid()).default([]),
  name: z.string().trim().min(1).max(120).optional(),
}).refine(data => data.email || data.userId, {
  message: 'Informe email ou userId',
})

export default defineEventHandler(async (event) => {
  const { id: organizationId } = paramsSchema.parse({ id: getRouterParam(event, 'id') })
  const input = schema.parse(await readBody(event))

  const context = await requireWorkspaceContext(event, {
    organizationId,
    capability: 'organization.team.manage',
  })

  const organization = context.organization!
  if (!organization.anchorTenantId)
    throw createError({ statusCode: 409, statusMessage: 'Organização sem empresa principal' })

  const role = await loadOrganizationRole(context.client, input.roleId, organizationId)

  const { data: roleCaps } = await context.client
    .from('organization_role_capabilities')
    .select('capability, allowed')
    .eq('role_id', role.id)
    .eq('allowed', true)

  assertAssignableCapabilities(
    context.capabilities,
    (roleCaps || []).map((row: any) => String(row.capability)),
  )

  const { data: portfolio } = await context.client
    .from('organization_tenants')
    .select('tenant_id')
    .eq('organization_id', organizationId)
    .eq('is_active', true)

  const portfolioTenantIds = new Set((portfolio || []).map((row: any) => String(row.tenant_id)))
  const assignedTenantIds = [...new Set(input.tenantIds)]

  for (const tenantId of assignedTenantIds) {
    if (!portfolioTenantIds.has(tenantId))
      throw createError({ statusCode: 422, statusMessage: 'Empresa fora da carteira da organização' })
  }

  if (!input.accessAllTenants && !assignedTenantIds.length)
    throw createError({ statusCode: 422, statusMessage: 'Selecione ao menos uma empresa para o colaborador' })

  let userId = input.userId ?? null
  let createdUser = false
  let inviteSent = false
  const email = input.email?.trim().toLowerCase() ?? null

  if (!userId && email) {
    const invite = await inviteOrLinkAuthUserByEmail(context.client, {
      email,
      name: input.name,
      redirectTo: `${resolveAuthRedirectOrigin(event)}/confirm?flow=invite`,
    })
    userId = invite.userId
    createdUser = invite.invite_sent
    inviteSent = invite.invite_sent
  }

  if (!userId)
    throw createError({ statusCode: 422, statusMessage: 'Usuário não informado' })

  const { data: previous } = await context.client
    .from('organization_memberships')
    .select('id, role, role_id, is_active, access_all_tenants, user_id')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .maybeSingle()

  if (previous) {
    const previousRole = previous.role_id
      ? await loadOrganizationRole(context.client, String(previous.role_id), organizationId).catch(() => null)
      : null

    await assertMembershipRoleChange(context, {
      membershipId: String(previous.id),
      targetUserId: userId,
      previousRoleId: previous.role_id ? String(previous.role_id) : null,
      nextRoleId: role.id,
      nextRole: role,
      previousRole,
    })
  }

  const { data, error } = await context.client
    .from('organization_memberships')
    .upsert({
      organization_id: organizationId,
      tenant_id: organization.anchorTenantId,
      user_id: userId,
      role: role.legacy_app_role,
      role_id: role.id,
      is_active: true,
      access_all_tenants: input.accessAllTenants,
      created_by: previous?.id ? undefined : context.userId,
    }, { onConflict: 'organization_id,user_id' })
    .select('*')
    .single()

  if (error) {
    if (createdUser)
      await context.client.auth.admin.deleteUser(userId)
    throw createError({ statusCode: 400, statusMessage: error.message })
  }

  await context.client
    .from('organization_member_tenants')
    .delete()
    .eq('organization_membership_id', data.id)

  if (!input.accessAllTenants && assignedTenantIds.length) {
    const { error: assignError } = await context.client
      .from('organization_member_tenants')
      .insert(assignedTenantIds.map(tenantId => ({
        organization_membership_id: data.id,
        tenant_id: tenantId,
        is_active: true,
        created_by: context.userId,
      })))

    if (assignError)
      throw createError({ statusCode: 400, statusMessage: assignError.message })
  }

  // Paper trail for invites is kept in audit_events; a pending invite table row
  // is only created when we want a tokenized accept flow later.

  await recordAuditEvent(event, context.client, {
    tenantId: organization.anchorTenantId,
    organizationId,
    actorId: context.userId,
    action: previous ? 'organization.member.update' : 'organization.member.invite',
    entityType: 'organization_membership',
    entityId: data.id,
    before: previous ?? undefined,
    after: {
      user_id: userId,
      email,
      role_id: role.id,
      access_all_tenants: input.accessAllTenants,
      tenant_ids: assignedTenantIds,
      created_user: createdUser,
      invite_sent: inviteSent,
    },
  })

  return {
    data: {
      ...data,
      role_name: role.name,
      tenant_ids: assignedTenantIds,
      created_user: createdUser,
      invite_sent: inviteSent,
    },
  }
})
