import { resolveHubPersona, type HubPersona } from '~/composables/useHubHome'
import { buildHubAttention } from '~/server/utils/hub-home'
import { requireWorkspaceContext } from '~/server/utils/workspace-context'

/**
 * Lightweight hub home payload: attention queues scoped to the current persona.
 * Prefer this over N round-trips from the browser on `/`.
 */
export default defineEventHandler(async (event) => {
  const context = await requireWorkspaceContext(event)

  const persona: HubPersona = resolveHubPersona({
    isPlatformStaff: context.isPlatformStaff,
    isAgencyWorkspace: context.organization?.type === 'agency',
    effectiveRole: context.effectiveRole || context.tenantRole || context.organizationRole,
  })

  const attention = await buildHubAttention(context, persona)

  return {
    data: {
      persona,
      tenant_id: context.tenant?.id ?? null,
      organization_id: context.organization?.id ?? null,
      attention,
      generated_at: new Date().toISOString(),
    },
  }
})
