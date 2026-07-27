import type { OrganizationType, WorkspaceCapability } from '~/constants/workspace'

import { holdsCapability } from '~/constants/workspace'

export type NavAudience = 'agency' | 'client' | 'both'

/** Whether a menu/route entry should render for the current audience. */
export function matchesNavAudience(
  audience: NavAudience | undefined | null,
  isClientExperience: boolean,
): boolean {
  const resolved = audience ?? 'both'
  if (resolved === 'both')
    return true
  if (resolved === 'client')
    return isClientExperience
  return !isClientExperience
}

/**
 * Requirements declared by a route or a menu entry. Both are UX shortcuts: the
 * endpoints behind each screen authorize independently on the server.
 */
export interface WorkspaceRouteRequirements {
  capability?: WorkspaceCapability | string | null
  organizationTypes?: readonly OrganizationType[] | null
  audience?: NavAudience | null
}

/** Scope already resolved by the server and exposed through `useWorkspace`. */
export interface WorkspaceRouteScope {
  capabilities: readonly string[] | ReadonlySet<string>
  organizationType: OrganizationType | null
  isClientExperience?: boolean
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

  if (requirements.audience && !matchesNavAudience(
    requirements.audience,
    Boolean(scope.isClientExperience),
  )) {
    return false
  }

  return true
}
