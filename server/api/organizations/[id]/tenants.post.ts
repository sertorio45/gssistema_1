import { getRouterParam, readBody } from 'h3'
import { z } from 'zod'

import { recordAuditEvent } from '~/server/utils/audit-events'
import { requireWorkspaceContext } from '~/server/utils/workspace-context'

const schema = z.object({
  tenantId: z.string().uuid(),
  isPrimary: z.boolean().default(false),
  relationshipType: z.enum(['owner', 'managed']).optional(),
})

const paramsSchema = z.object({
  id: z.string().uuid(),
})

/** Adding a workspace to an organization portfolio stays a platform decision. */
export default defineEventHandler(async (event) => {
  const { id: organizationId } = paramsSchema.parse({ id: getRouterParam(event, 'id') })
  const input = schema.parse(await readBody(event))

  const context = await requireWorkspaceContext(event, {
    organizationId,
    platformOnly: true,
    capability: 'platform.organizations.manage',
  })

  const { data: tenant } = await context.client
    .from('tenant')
    .select('id, name')
    .eq('id', input.tenantId)
    .maybeSingle()

  if (!tenant)
    throw createError({ statusCode: 404, statusMessage: 'Empresa não encontrada' })

  const relationshipType = input.relationshipType
    ?? (context.organization?.anchorTenantId === input.tenantId ? 'owner' : 'managed')

  const { data, error } = await context.client
    .from('organization_tenants')
    .upsert({
      organization_id: organizationId,
      tenant_id: input.tenantId,
      is_primary: input.isPrimary,
      relationship_type: relationshipType,
      is_active: true,
      ended_at: null,
      created_by: context.userId,
    }, { onConflict: 'organization_id,tenant_id' })
    .select('*')
    .single()

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  await recordAuditEvent(event, context.client, {
    tenantId: input.tenantId,
    organizationId,
    actorId: context.userId,
    action: 'organization.tenant.link',
    entityType: 'organization_tenant',
    entityId: data.id,
    after: {
      tenant_id: input.tenantId,
      is_primary: input.isPrimary,
      relationship_type: relationshipType,
    },
  })

  return { data }
})
