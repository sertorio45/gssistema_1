import { getQuery } from 'h3'
import { z } from 'zod'

import { listAccessibleTenants, requireWorkspaceContext } from '~/server/utils/workspace-context'

const querySchema = z.object({
  organization_id: z.string().uuid().optional(),
})

export default defineEventHandler(async (event) => {
  const input = querySchema.parse(getQuery(event))

  // Organization-scoped listing must prove membership before reading the portfolio.
  const context = await requireWorkspaceContext(event, {
    organizationId: input.organization_id ?? null,
  })

  const tenants = await listAccessibleTenants(context.client, {
    userId: context.userId,
    isPlatformStaff: context.isPlatformStaff,
    organizationId: input.organization_id ?? null,
  })

  return {
    tenants: tenants.map(tenant => ({
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      is_active: tenant.isActive,
      organization_id: tenant.organizationId,
      relationship_type: tenant.relationshipType,
    })),
    portfolio: context.isPlatformStaff
      || tenants.some(tenant => tenant.relationshipType === 'managed'),
  }
})
