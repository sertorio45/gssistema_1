import { getRouterParam, readBody } from 'h3'
import { z } from 'zod'

import { recordAuditEvent } from '~/server/utils/audit-events'
import {
  assertAssignableCapabilities,
  assertCanDeactivateMembership,
  assertMembershipRoleChange,
  loadOrganizationRole,
} from '~/server/utils/organization-roles'
import { requireWorkspaceContext } from '~/server/utils/workspace-context'

const paramsSchema = z.object({
  id: z.string().uuid(),
  membershipId: z.string().uuid(),
})

const schema = z.object({
  roleId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
  accessAllTenants: z.boolean().optional(),
  tenantIds: z.array(z.string().uuid()).optional(),
})

export default defineEventHandler(async (event) => {
  const params = paramsSchema.parse({
    id: getRouterParam(event, 'id'),
    membershipId: getRouterParam(event, 'membershipId'),
  })
  const input = schema.parse(await readBody(event))

  const context = await requireWorkspaceContext(event, {
    organizationId: params.id,
    capability: 'organization.team.manage',
  })

  const { data: membership, error } = await context.client
    .from('organization_memberships')
    .select('id, user_id, role, role_id, is_active, access_all_tenants')
    .eq('id', params.membershipId)
    .eq('organization_id', params.id)
    .maybeSingle()

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })
  if (!membership)
    throw createError({ statusCode: 404, statusMessage: 'Membro não encontrado' })

  const previousRole = membership.role_id
    ? await loadOrganizationRole(context.client, String(membership.role_id), params.id).catch(() => null)
    : null

  const updates: Record<string, unknown> = {}

  if (typeof input.isActive === 'boolean' && input.isActive !== membership.is_active) {
    if (!input.isActive)
      await assertCanDeactivateMembership(context, membership as any, previousRole)
    updates.is_active = input.isActive
  }

  if (input.roleId && input.roleId !== membership.role_id) {
    const nextRole = await loadOrganizationRole(context.client, input.roleId, params.id)

    const { data: roleCaps } = await context.client
      .from('organization_role_capabilities')
      .select('capability')
      .eq('role_id', nextRole.id)
      .eq('allowed', true)

    assertAssignableCapabilities(
      context.capabilities,
      (roleCaps || []).map((row: any) => String(row.capability)),
    )

    await assertMembershipRoleChange(context, {
      membershipId: String(membership.id),
      targetUserId: String(membership.user_id),
      previousRoleId: membership.role_id ? String(membership.role_id) : null,
      nextRoleId: nextRole.id,
      nextRole,
      previousRole,
    })

    updates.role_id = nextRole.id
    updates.role = nextRole.legacy_app_role
  }

  if (typeof input.accessAllTenants === 'boolean')
    updates.access_all_tenants = input.accessAllTenants

  if (Object.keys(updates).length) {
    const { error: updateError } = await context.client
      .from('organization_memberships')
      .update(updates)
      .eq('id', membership.id)

    if (updateError)
      throw createError({ statusCode: 400, statusMessage: updateError.message })
  }

  if (input.tenantIds || typeof input.accessAllTenants === 'boolean') {
    const accessAll = typeof input.accessAllTenants === 'boolean'
      ? input.accessAllTenants
      : membership.access_all_tenants

    await context.client
      .from('organization_member_tenants')
      .delete()
      .eq('organization_membership_id', membership.id)

    if (!accessAll && input.tenantIds?.length) {
      const { data: portfolio } = await context.client
        .from('organization_tenants')
        .select('tenant_id')
        .eq('organization_id', params.id)
        .eq('is_active', true)

      const portfolioIds = new Set((portfolio || []).map((row: any) => String(row.tenant_id)))
      for (const tenantId of input.tenantIds) {
        if (!portfolioIds.has(tenantId))
          throw createError({ statusCode: 422, statusMessage: 'Empresa fora da carteira da organização' })
      }

      await context.client.from('organization_member_tenants').insert(
        input.tenantIds.map(tenantId => ({
          organization_membership_id: membership.id,
          tenant_id: tenantId,
          is_active: true,
          created_by: context.userId,
        })),
      )
    }
  }

  await recordAuditEvent(event, context.client, {
    tenantId: context.organization!.anchorTenantId,
    organizationId: params.id,
    actorId: context.userId,
    action: 'organization.member.update',
    entityType: 'organization_membership',
    entityId: membership.id,
    before: membership,
    after: { ...updates, tenant_ids: input.tenantIds },
  })

  return { ok: true }
})
