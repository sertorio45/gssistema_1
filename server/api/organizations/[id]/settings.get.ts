import { getRouterParam } from 'h3'
import { z } from 'zod'

import {
  assertAgencyOrganization,
  extractAgencyBranding,
} from '~/server/utils/agency-ops'
import { requireWorkspaceContext } from '~/server/utils/workspace-context'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

export default defineEventHandler(async (event) => {
  const { id: organizationId } = paramsSchema.parse({ id: getRouterParam(event, 'id') })

  const context = await requireWorkspaceContext(event, {
    organizationId,
    capability: 'organization.read',
  })

  const organization = assertAgencyOrganization(context)

  return {
    data: {
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        type: organization.type,
        is_active: organization.isActive,
      },
      branding: extractAgencyBranding(organization.settings),
    },
  }
})
