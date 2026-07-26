import { getRouterParam, readBody } from 'h3'
import { z } from 'zod'

import { recordAuditEvent } from '~/server/utils/audit-events'
import { loadOrganizationRole } from '~/server/utils/organization-roles'
import { requireWorkspaceContext } from '~/server/utils/workspace-context'

const paramsSchema = z.object({
  id: z.string().uuid(),
  roleId: z.string().uuid(),
})

const schema = z.object({
  replacementRoleId: z.string().uuid().optional(),
})

export default defineEventHandler(async (event) => {
  const params = paramsSchema.parse({
    id: getRouterParam(event, 'id'),
    roleId: getRouterParam(event, 'roleId'),
  })
  const input = schema.parse(await readBody(event).catch(() => ({})))

  const context = await requireWorkspaceContext(event, {
    organizationId: params.id,
    capability: 'organization.roles.manage',
  })

  const role = await loadOrganizationRole(context.client, params.roleId, params.id)

  if (role.is_protected || role.is_system) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Cargos protegidos do sistema não podem ser excluídos',
    })
  }

  const { count } = await context.client
    .from('organization_memberships')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', params.id)
    .eq('role_id', role.id)

  if ((count ?? 0) > 0) {
    if (!input.replacementRoleId) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Cargo em uso. Informe um cargo substituto antes de excluir.',
      })
    }

    const replacement = await loadOrganizationRole(
      context.client,
      input.replacementRoleId,
      params.id,
    )

    if (replacement.id === role.id) {
      throw createError({
        statusCode: 422,
        statusMessage: 'O cargo substituto deve ser diferente do cargo excluído',
      })
    }

    const { error: reassignError } = await context.client
      .from('organization_memberships')
      .update({
        role_id: replacement.id,
        role: replacement.legacy_app_role,
      })
      .eq('organization_id', params.id)
      .eq('role_id', role.id)

    if (reassignError)
      throw createError({ statusCode: 400, statusMessage: reassignError.message })
  }

  const { error } = await context.client
    .from('organization_roles')
    .delete()
    .eq('id', role.id)

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  await recordAuditEvent(event, context.client, {
    tenantId: context.organization!.anchorTenantId,
    organizationId: params.id,
    actorId: context.userId,
    action: 'organization.role.delete',
    entityType: 'organization_role',
    entityId: role.id,
    before: { name: role.name, slug: role.slug },
    after: { replacement_role_id: input.replacementRoleId ?? null },
  })

  return { ok: true }
})
