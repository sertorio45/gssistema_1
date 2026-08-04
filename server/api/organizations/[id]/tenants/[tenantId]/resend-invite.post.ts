import { getRouterParam, readBody } from 'h3'
import { z } from 'zod'

import {
  assertAgencyOrganization,
  listAccessibleManagedClientIds,
} from '~/server/utils/agency-ops'
import {
  resendClientAccessEmail,
  resolveAuthRedirectOrigin,
} from '~/server/utils/auth-invite'
import { recordAuditEvent } from '~/server/utils/audit-events'
import { requireWorkspaceContext } from '~/server/utils/workspace-context'

const paramsSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
})

const bodySchema = z.object({
  email: z.string().email(),
  name: z.string().trim().min(1).max(120).optional(),
  /** When true, also ensure user_tenant_role = cliente for this tenant. */
  ensureClientRole: z.boolean().default(true),
})

/**
 * Resend access email for an agency client workspace without recreating the tenant.
 */
export default defineEventHandler(async (event) => {
  const params = paramsSchema.parse({
    id: getRouterParam(event, 'id'),
    tenantId: getRouterParam(event, 'tenantId'),
  })
  const input = bodySchema.parse(await readBody(event))

  const context = await requireWorkspaceContext(event, {
    organizationId: params.id,
    capability: 'agency.clients.manage',
  })

  assertAgencyOrganization(context)

  const reachable = await listAccessibleManagedClientIds(context, params.id)
  if (!reachable.includes(params.tenantId)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Cliente fora do seu alcance nesta agência',
    })
  }

  const siteUrl = resolveAuthRedirectOrigin(event)
  const redirectTo = `${siteUrl}/confirm?flow=invite`

  const result = await resendClientAccessEmail(context.client, {
    email: input.email,
    name: input.name,
    redirectTo,
  })

  if (input.ensureClientRole) {
    await context.client
      .from('user_tenant_role')
      .upsert({
        user_id: result.user_id,
        tenant_id: params.tenantId,
        role: 'cliente',
      }, { onConflict: 'user_id,tenant_id' })
  }

  // New address may skip inviteOrLink if we only hit recovery path for existing —
  // if invite didn't create user, ensure link for brand-new addresses already handled.

  await recordAuditEvent(event, context.client, {
    tenantId: params.tenantId,
    organizationId: params.id,
    actorId: context.userId,
    action: 'agency.client.invite_resend',
    entityType: 'tenant',
    entityId: params.tenantId,
    after: {
      email: result.email,
      method: result.method,
      invite_sent: result.invite_sent,
    },
  })

  return {
    data: {
      email: result.email,
      invite_sent: result.invite_sent,
      method: result.method,
      user_id: result.user_id,
    },
  }
})
