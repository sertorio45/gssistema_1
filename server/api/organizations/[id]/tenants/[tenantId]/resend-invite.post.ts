import { getRouterParam, readBody } from 'h3'
import { z } from 'zod'

import {
  assertAgencyOrganization,
  listAccessibleManagedClientIds,
} from '~/server/utils/agency-ops'
import { recordAuditEvent } from '~/server/utils/audit-events'
import {
  resendClientAccessEmail,
  resolveAuthRedirectOrigin,
} from '~/server/utils/auth-invite'
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

const RATE_LIMIT_WINDOW_MS = 10 * 60_000
const RATE_LIMIT_MAX = 5

/**
 * Invite links grant a session: cap how often they can be minted per client.
 * Fails closed — an unreadable audit trail must not disable the throttle.
 */
async function assertResendRateLimit(client: any, tenantId: string) {
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString()
  const { count, error } = await client
    .from('audit_events')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('action', 'agency.client.invite_resend')
    .gte('created_at', since)

  if (error) {
    console.error('[resend-invite] rate limit check failed', error.message)
    throw createError({
      statusCode: 503,
      statusMessage: 'Não foi possível validar o limite de reenvios agora. Tente novamente em instantes.',
    })
  }

  if ((count || 0) >= RATE_LIMIT_MAX) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Muitos reenvios para esta empresa. Aguarde alguns minutos antes de tentar novamente.',
    })
  }
}

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

  await assertResendRateLimit(context.client, params.tenantId)

  const siteUrl = resolveAuthRedirectOrigin(event)
  const redirectTo = `${siteUrl}/confirm?flow=invite`

  const result = await resendClientAccessEmail(context.client, {
    email: input.email,
    name: input.name,
    tenantId: params.tenantId,
    redirectTo,
  })

  if (input.ensureClientRole) {
    const { error: roleError } = await context.client
      .from('user_tenant_role')
      .upsert({
        user_id: result.user_id,
        tenant_id: params.tenantId,
        role: 'cliente',
      }, { onConflict: 'user_id,tenant_id' })

    if (roleError) {
      throw createError({
        statusCode: 400,
        statusMessage: `Acesso enviado, mas o vínculo com a empresa falhou: ${roleError.message}`,
      })
    }
  }

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
      email_sent: result.email_sent,
      link_generated: Boolean(result.action_link),
    },
  })

  return {
    data: {
      email: result.email,
      user_id: result.user_id,
      method: result.method,
      email_sent: result.email_sent,
      action_link: result.action_link,
      link_error: result.link_error,
    },
  }
})
