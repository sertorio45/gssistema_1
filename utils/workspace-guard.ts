import type { OrganizationType, WorkspaceCapability } from '~/constants/workspace'

import { holdsCapability } from '~/constants/workspace'

/**
 * Requirements declared by a route or a menu entry. Both are UX shortcuts: the
 * endpoints behind each screen authorize independently on the server.
 */
export interface WorkspaceRouteRequirements {
  capability?: WorkspaceCapability | string | null
  organizationTypes?: readonly OrganizationType[] | null
}

/** Scope already resolved by the server and exposed through `useWorkspace`. */
export interface WorkspaceRouteScope {
  capabilities: readonly string[] | ReadonlySet<string>
  organizationType: OrganizationType | null
}

/**
 * A direct customer must never reach agency-only screens, and nobody reaches a
 * screen whose capability is missing from the resolved scope.
 */
export function canEnterWorkspaceRoute(
  scope: WorkspaceRouteScope,
  requirements: WorkspaceRouteRequirements,
): boolean {
  if (requirements.capability && !holdsCapability(scope.capabilities, requirements.capability))
    return false

  const allowedTypes = requirements.organizationTypes
  if (allowedTypes?.length) {
    if (!scope.organizationType || !allowedTypes.includes(scope.organizationType))
      return false
  }

  return true
}
