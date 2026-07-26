import type { WorkspaceContext } from '~/server/utils/workspace-context'

import { requireWorkspaceContext } from '~/server/utils/workspace-context'

/**
 * Organization-scoped gate. Kept as a thin adapter so existing handlers keep
 * their shape while authorization lives in `requireWorkspaceContext`.
 */
export async function requireOrganizationContext(
  event: any,
  organizationId?: string,
  options: { manage?: boolean, platformOnly?: boolean } = {},
) {
  const context: WorkspaceContext = await requireWorkspaceContext(event, {
    organizationId: organizationId ?? null,
    platformOnly: options.platformOnly,
    manageOrganization: options.manage && organizationId ? true : undefined,
  })

  return {
    user: context.user,
    client: context.client,
    isPlatformStaff: context.isPlatformStaff,
    membership: context.organizationMembership,
    organization: context.organization,
    context,
  }
}
