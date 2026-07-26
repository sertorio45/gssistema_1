import { getRouterParam } from 'h3'
import { z } from 'zod'

import { recordAuditEvent } from '~/server/utils/audit-events'
import { requireWorkspaceContext } from '~/server/utils/workspace-context'

const paramsSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
})

/**
 * Ends the relationship without deleting history. The access resolver stops
 * honouring the link immediately, so the workspace disappears for the members.
 */
export default defineEventHandler(async (event) => {
  const params = paramsSchema.parse({
    id: getRouterParam(event, 'id'),
    tenantId: getRouterParam(event, 'tenantId'),
  })

  const context = await requireWorkspaceContext(event, {
    organizationId: params.id,
    platformOnly: true,
    capability: 'platform.organizations.manage',
  })

  const { data: link } = await context.client
    .from('organization_tenants')
    .select('id, is_primary, relationship_type, is_active')
    .eq('organization_id', params.id)
    .eq('tenant_id', params.tenantId)
    .maybeSingle()

  if (!link)
    throw createError({ statusCode: 404, statusMessage: 'Vínculo não encontrado' })

  if (link.relationship_type === 'owner')
    throw createError({ statusCode: 409, statusMessage: 'A empresa principal não pode ser removida da organização' })

  const { data, error } = await context.client
    .from('organization_tenants')
    .update({
      is_active: false,
      ended_at: new Date().toISOString(),
      is_primary: false,
    })
    .eq('id', link.id)
    .select('*')
    .single()

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  const { data: memberships } = await context.client
    .from('organization_memberships')
    .select('id')
    .eq('organization_id', params.id)

  const membershipIds = (memberships || []).map((row: any) => String(row.id))
  if (membershipIds.length) {
    await context.client
      .from('organization_member_tenants')
      .update({ is_active: false })
      .eq('tenant_id', params.tenantId)
      .in('organization_membership_id', membershipIds)
  }

  await recordAuditEvent(event, context.client, {
    tenantId: params.tenantId,
    organizationId: params.id,
    actorId: context.userId,
    action: 'organization.tenant.unlink',
    entityType: 'organization_tenant',
    entityId: link.id,
    before: link,
    after: { is_active: false },
  })

  return { data }
})
