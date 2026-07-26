import { getRouterParam, readBody } from 'h3'
import { z } from 'zod'

import { recordAuditEvent } from '~/server/utils/audit-events'
import { requireWorkspaceContext } from '~/server/utils/workspace-context'

const schema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['cliente', 'atendente']),
  /** False narrows the collaborator down to `tenantIds`. */
  accessAllTenants: z.boolean().default(true),
  tenantIds: z.array(z.string().uuid()).default([]),
})

const paramsSchema = z.object({
  id: z.string().uuid(),
})

export default defineEventHandler(async (event) => {
  const { id: organizationId } = paramsSchema.parse({ id: getRouterParam(event, 'id') })
  const input = schema.parse(await readBody(event))

  const context = await requireWorkspaceContext(event, {
    organizationId,
    capability: 'organization.members.manage',
  })

  const organization = context.organization!
  if (!organization.anchorTenantId)
    throw createError({ statusCode: 409, statusMessage: 'Organização sem empresa principal' })

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

  const { data: previous } = await context.client
    .from('organization_memberships')
    .select('id, role, is_active, access_all_tenants')
    .eq('organization_id', organizationId)
    .eq('user_id', input.userId)
    .maybeSingle()

  const { data, error } = await context.client
    .from('organization_memberships')
    .upsert({
      organization_id: organizationId,
      tenant_id: organization.anchorTenantId,
      user_id: input.userId,
      role: input.role,
      is_active: true,
      access_all_tenants: input.accessAllTenants,
      created_by: previous?.id ? undefined : context.userId,
    }, { onConflict: 'organization_id,user_id' })
    .select('*')
    .single()

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

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

  await recordAuditEvent(event, context.client, {
    tenantId: organization.anchorTenantId,
    organizationId,
    actorId: context.userId,
    action: previous ? 'organization.member.update' : 'organization.member.create',
    entityType: 'organization_membership',
    entityId: data.id,
    before: previous ?? undefined,
    after: {
      user_id: input.userId,
      role: input.role,
      access_all_tenants: input.accessAllTenants,
      tenant_ids: assignedTenantIds,
    },
  })

  return { data: { ...data, tenant_ids: assignedTenantIds } }
})
