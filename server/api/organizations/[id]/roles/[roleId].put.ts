import { getRouterParam, readBody } from 'h3'
import { z } from 'zod'

import { recordAuditEvent } from '~/server/utils/audit-events'
import {
  assertAssignableCapabilities,
  loadOrganizationRole,
  replaceRoleCapabilities,
} from '~/server/utils/organization-roles'
import { requireWorkspaceContext } from '~/server/utils/workspace-context'

const paramsSchema = z.object({
  id: z.string().uuid(),
  roleId: z.string().uuid(),
})

const schema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(500).optional(),
  capabilities: z.array(z.string()).optional(),
})

export default defineEventHandler(async (event) => {
  const params = paramsSchema.parse({
    id: getRouterParam(event, 'id'),
    roleId: getRouterParam(event, 'roleId'),
  })
  const input = schema.parse(await readBody(event))

  const context = await requireWorkspaceContext(event, {
    organizationId: params.id,
    capability: 'organization.roles.manage',
  })

  const role = await loadOrganizationRole(context.client, params.roleId, params.id)

  if (!role.is_editable || role.is_protected) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Este cargo é protegido e não pode ser editado',
    })
  }

  if (input.capabilities)
    assertAssignableCapabilities(context.capabilities, input.capabilities)

  const { data, error } = await context.client
    .from('organization_roles')
    .update({
      name: input.name ?? role.name,
      description: input.description ?? role.description,
    })
    .eq('id', role.id)
    .select('*')
    .single()

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  if (input.capabilities)
    await replaceRoleCapabilities(context.client, role.id, [...new Set(input.capabilities)])

  await recordAuditEvent(event, context.client, {
    tenantId: context.organization!.anchorTenantId,
    organizationId: params.id,
    actorId: context.userId,
    action: 'organization.role.update',
    entityType: 'organization_role',
    entityId: role.id,
    before: { name: role.name, description: role.description },
    after: {
      name: data.name,
      description: data.description,
      capabilities: input.capabilities,
    },
  })

  return { data }
})
