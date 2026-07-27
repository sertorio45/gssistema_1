import { getQuery } from 'h3'
import { z } from 'zod'
import { serverSupabaseUser } from '#supabase/server'

import {
  getWorkspaceBootstrapCache,
  setWorkspaceBootstrapCache,
  workspaceBootstrapCacheKey,
} from '~/server/utils/workspace-bootstrap-cache'
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

  const user = await serverSupabaseUser(event).catch(() => null)
  if (!user)
    throw createError({ statusCode: 401, statusMessage: 'Não autenticado' })

  const cacheKey = workspaceBootstrapCacheKey(
    user.id,
    input.organization_id,
    input.tenant_id,
  )
  const cached = getWorkspaceBootstrapCache(cacheKey)
  if (cached)
    return cached

  let requestedContextRejected = false
  let context = null as Awaited<ReturnType<typeof requireWorkspaceContext>> | null

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

  // Empty or rejected scope: land on the agency portfolio (never a shadow direct).
  if (context && (requestedContextRejected || !context.organization || !context.tenant)) {
    const organizations = await listAccessibleOrganizations(context.client, {
      userId: context.userId,
      isPlatformStaff: context.isPlatformStaff,
    })

    const preferredOrg = organizations.find(item => item.type === 'agency' && item.isActive)
      ?? organizations.find(item => item.isActive)
      ?? null

    if (preferredOrg) {
      const portfolio = await listAccessibleTenants(context.client, {
        userId: context.userId,
        isPlatformStaff: context.isPlatformStaff,
        organizationId: preferredOrg.id,
      })

      const preferredTenant = portfolio.find(item => item.id === preferredOrg.anchorTenantId)
        ?? portfolio.find(item => item.isActive)
        ?? null

      try {
        context = await requireWorkspaceContext(event, {
          organizationId: preferredOrg.id,
          tenantId: preferredTenant?.id ?? null,
        })
      }
      catch {
        // Keep the empty bootstrap; the UI will ask the user to pick.
      }
    }
  }

  const [organizations, tenants] = await Promise.all([
    listAccessibleOrganizations(context!.client, {
      userId: context!.userId,
      isPlatformStaff: context!.isPlatformStaff,
    }),
    listAccessibleTenants(context!.client, {
      userId: context!.userId,
      isPlatformStaff: context!.isPlatformStaff,
      // Prefer the resolved organization so the switcher shows the agency portfolio.
      organizationId: context!.organization?.id ?? null,
    }),
  ])

  const payload = {
    ...serializeWorkspaceContext(context!),
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

  setWorkspaceBootstrapCache(cacheKey, payload)
  // Also cache under the resolved scope so a follow-up with explicit ids hits.
  if (context?.organization?.id || context?.tenantId) {
    setWorkspaceBootstrapCache(
      workspaceBootstrapCacheKey(user.id, context.organization?.id, context.tenantId),
      payload,
    )
  }

  return payload
})
