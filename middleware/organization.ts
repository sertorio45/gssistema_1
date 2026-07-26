import type { OrganizationType, WorkspaceCapability } from '~/constants/workspace'

import { useWorkspace } from '~/composables/useWorkspace'
import { canEnterWorkspaceRoute } from '~/utils/workspace-guard'

/**
 * Route guard for organization-scoped pages. This is a UX shortcut only — the
 * endpoints behind each page authorize independently.
 *
 * Usage: `definePageMeta({ middleware: ['auth', 'organization'],
 *   requiredCapability: 'organization.members.manage',
 *   allowedOrganizationTypes: ['agency'] })`
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const workspace = useWorkspace()

  if (!workspace.context.value) {
    try {
      await workspace.load()
    }
    catch {
      return navigateTo('/403')
    }
  }

  const allowed = canEnterWorkspaceRoute(
    {
      capabilities: workspace.context.value?.capabilities ?? [],
      organizationType: workspace.organizationType.value,
    },
    {
      capability: to.meta.requiredCapability as WorkspaceCapability | undefined,
      organizationTypes: to.meta.allowedOrganizationTypes as OrganizationType[] | undefined,
    },
  )

  if (!allowed)
    return navigateTo('/403')
})
