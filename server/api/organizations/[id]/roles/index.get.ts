import { getRouterParam } from 'h3'
import { z } from 'zod'

import { listOrganizationRoles } from '~/server/utils/organization-roles'
import { requireWorkspaceContext } from '~/server/utils/workspace-context'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

export default defineEventHandler(async (event) => {
  const { id: organizationId } = paramsSchema.parse({ id: getRouterParam(event, 'id') })

  const context = await requireWorkspaceContext(event, { organizationId })

  if (!context.has('organization.roles.read') && !context.has('organization.team.manage')
    && !context.has('organization.members.manage')) {
    throw createError({ statusCode: 403, statusMessage: 'Sem permissão para esta ação' })
  }

  return { data: await listOrganizationRoles(context.client, organizationId) }
})
