import { getRouterParam, readBody } from 'h3'
import { z } from 'zod'

import { recordAuditEvent } from '~/server/utils/audit-events'
import { requireWorkspaceContext } from '~/server/utils/workspace-context'

const paramsSchema = z.object({
  id: z.string().uuid(),
  membershipId: z.string().uuid(),
})

const bodySchema = z.object({
  accessAllTenants: z.boolean(),
  tenantIds: z.array(z.string().uuid()).default([]),
})

/** Defines which client workspaces an organization collaborator may open. */
export default defineEventHandler(async (event) => {
  const params = paramsSchema.parse({
    id: getRouterParam(event, 'id'),
    membershipId: getRouterParam(event, 'membershipId'),
  })
  const input = bodySchema.parse(await readBody(event))

  const context = await requireWorkspaceContext(event, {
    organizationId: params.id,
    capability: 'organization.members.manage',
  })

  const { data: membership } = await context.client
    .from('organization_memberships')
    .select('id, organization_id, user_id, role, access_all_tenants')
    .eq('id', params.membershipId)
    .eq('organization_id', params.id)
    .maybeSingle()

  if (!membership)
    throw createError({ statusCode: 404, statusMessage: 'Colaborador não encontrado nesta organização' })

  const assignedTenantIds = [...new Set(input.tenantIds)]

  if (!input.accessAllTenants && !assignedTenantIds.length)
    throw createError({ statusCode: 422, statusMessage: 'Selecione ao menos uma empresa para o colaborador' })

  if (assignedTenantIds.length) {
    const { data: portfolio } = await context.client
      .from('organization_tenants')
      .select('tenant_id')
      .eq('organization_id', params.id)
      .eq('is_active', true)
      .in('tenant_id', assignedTenantIds)

    if ((portfolio || []).length !== assignedTenantIds.length)
      throw createError({ statusCode: 422, statusMessage: 'Empresa fora da carteira da organização' })
  }

  const { data: previousAssignments } = await context.client
    .from('organization_member_tenants')
    .select('tenant_id')
    .eq('organization_membership_id', membership.id)
    .eq('is_active', true)

  const { error: updateError } = await context.client
    .from('organization_memberships')
    .update({ access_all_tenants: input.accessAllTenants })
    .eq('id', membership.id)

  if (updateError)
    throw createError({ statusCode: 400, statusMessage: updateError.message })

  await context.client
    .from('organization_member_tenants')
    .delete()
    .eq('organization_membership_id', membership.id)

  if (!input.accessAllTenants && assignedTenantIds.length) {
    const { error: insertError } = await context.client
      .from('organization_member_tenants')
      .insert(assignedTenantIds.map(tenantId => ({
        organization_membership_id: membership.id,
        tenant_id: tenantId,
        is_active: true,
        created_by: context.userId,
      })))

    if (insertError)
      throw createError({ statusCode: 400, statusMessage: insertError.message })
  }

  await recordAuditEvent(event, context.client, {
    tenantId: context.organization?.anchorTenantId ?? null,
    organizationId: params.id,
    actorId: context.userId,
    action: 'organization.member.tenants.update',
    entityType: 'organization_membership',
    entityId: membership.id,
    before: {
      access_all_tenants: membership.access_all_tenants,
      tenant_ids: (previousAssignments || []).map((row: any) => String(row.tenant_id)),
    },
    after: {
      access_all_tenants: input.accessAllTenants,
      tenant_ids: assignedTenantIds,
    },
  })

  return {
    data: {
      membership_id: membership.id,
      access_all_tenants: input.accessAllTenants,
      tenant_ids: assignedTenantIds,
    },
  }
})
