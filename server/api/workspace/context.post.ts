import { readBody } from 'h3'
import { z } from 'zod'

import { recordAuditEvent } from '~/server/utils/audit-events'
import { invalidateWorkspaceBootstrapCache } from '~/server/utils/workspace-bootstrap-cache'
import { requireWorkspaceContext } from '~/server/utils/workspace-context'
import { serializeWorkspaceContext } from '~/server/utils/workspace-serializer'

const bodySchema = z.object({
  organizationId: z.string().uuid().nullable().optional(),
  tenantId: z.string().uuid().nullable().optional(),
})

/**
 * Confirms a context switch. The client may only *ask* for a scope; this handler
 * decides, and every switch performed by platform staff is audited.
 */
export default defineEventHandler(async (event) => {
  const input = bodySchema.parse(await readBody(event))

  const context = await requireWorkspaceContext(event, {
    organizationId: input.organizationId ?? null,
    tenantId: input.tenantId ?? null,
  })

  invalidateWorkspaceBootstrapCache(context.userId)

  if (context.isPlatformStaff && (context.organization || context.tenant)) {
    await recordAuditEvent(event, context.client, {
      tenantId: context.tenantId,
      organizationId: context.organization?.id ?? null,
      actorId: context.userId,
      action: 'workspace.context.switch',
      entityType: 'workspace_context',
      entityId: context.tenantId ?? context.organization?.id ?? null,
      after: {
        global_role: context.globalRole,
        organization_id: context.organization?.id ?? null,
        organization_slug: context.organization?.slug ?? null,
        organization_type: context.organization?.type ?? null,
        tenant_id: context.tenantId,
        tenant_slug: context.tenant?.slug ?? null,
        requested_source: context.requested.source,
      },
    })
  }

  return serializeWorkspaceContext(context)
})
