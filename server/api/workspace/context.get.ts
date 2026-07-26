import { getQuery } from 'h3'
import { z } from 'zod'

import {
  listAccessibleOrganizations,
  listAccessibleTenants,
  requireWorkspaceContext,
} from '~/server/utils/workspace-context'
import { serializeWorkspaceContext } from '~/server/utils/workspace-serializer'

const querySchema = z.object({
  organization_id: z.string().uuid().optional(),
  tenant_id: z.string().uuid().optional(),
})

export default defineEventHandler(async (event) => {
  const input = querySchema.parse(getQuery(event))

  let requestedContextRejected = false
  let context = null

  try {
    context = await requireWorkspaceContext(event, {
      organizationId: input.organization_id ?? null,
      tenantId: input.tenant_id ?? null,
    })
  }
  catch (error: any) {
    // Bootstrap must never brick on a stale selection kept by the browser.
    if (!input.organization_id && !input.tenant_id)
      throw error
    if (error?.statusCode === 401)
      throw error
    requestedContextRejected = true
    context = await requireWorkspaceContext(event, {
      organizationId: null,
      tenantId: null,
    })
  }

  const [organizations, tenants] = await Promise.all([
    listAccessibleOrganizations(context.client, {
      userId: context.userId,
      isPlatformStaff: context.isPlatformStaff,
    }),
    listAccessibleTenants(context.client, {
      userId: context.userId,
      isPlatformStaff: context.isPlatformStaff,
      organizationId: requestedContextRejected ? null : input.organization_id ?? null,
    }),
  ])

  return {
    ...serializeWorkspaceContext(context),
    requestedContextRejected,
    organizations: organizations.map(organization => ({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      type: organization.type,
      is_active: organization.isActive,
      anchor_tenant_id: organization.anchorTenantId,
    })),
    tenants: tenants.map(tenant => ({
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      is_active: tenant.isActive,
      organization_id: tenant.organizationId,
      relationship_type: tenant.relationshipType,
    })),
  }
})
