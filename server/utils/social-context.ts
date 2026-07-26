import type { AppRoleSlug } from '~/constants/roles'
import type { MarketingSocialCapability } from '~/constants/workspace'
import type { WorkspaceContext } from '~/server/utils/workspace-context'

import { createError } from 'h3'

import { requireWorkspaceContext } from '~/server/utils/workspace-context'

export type SocialCapability = MarketingSocialCapability

interface SocialRequestContext {
  client: any
  user: WorkspaceContext['user']
  tenantId: string
  role: AppRoleSlug
  capability: SocialCapability
  isPlatformStaff: boolean
  workspace: WorkspaceContext
}

/**
 * Marketing Social gate. Delegates to the central workspace resolver so agency
 * portfolios, per-member tenant assignment and contracted modules are enforced
 * the same way everywhere.
 */
export async function requireSocialContext(
  event: any,
  capability: SocialCapability,
  requestedTenantId?: string | null,
): Promise<SocialRequestContext> {
  const workspace = await requireWorkspaceContext(event, {
    // A falsy id means "use whatever context the request carries", matching the
    // previous header/query/JWT fallback chain.
    ...(requestedTenantId ? { tenantId: requestedTenantId } : {}),
    requireTenant: true,
    module: 'marketing',
    capability,
  })

  if (!workspace.tenantId || !workspace.effectiveRole)
    throw createError({ statusCode: 403, statusMessage: 'Sem acesso a esta empresa' })

  return {
    client: workspace.client,
    user: workspace.user,
    tenantId: workspace.tenantId,
    role: workspace.effectiveRole,
    capability,
    isPlatformStaff: workspace.isPlatformStaff,
    workspace,
  }
}
