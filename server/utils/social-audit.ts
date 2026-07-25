import { randomUUID } from 'node:crypto'

import { getHeader, getRequestIP } from 'h3'

const SENSITIVE_KEYS = /token|secret|password|authorization|credential/i

function sanitize(value: unknown): unknown {
  if (Array.isArray(value))
    return value.map(sanitize)

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !SENSITIVE_KEYS.test(key))
        .map(([key, nested]) => [key, sanitize(nested)]),
    )
  }

  return value
}

export async function recordSocialAudit(
  event: any,
  client: any,
  input: {
    tenantId: string
    actorId?: string | null
    action: string
    entityType: string
    entityId?: string | null
    before?: unknown
    after?: unknown
  },
) {
  const requestId = getHeader(event, 'x-request-id') || randomUUID()
  const { error } = await client.from('audit_events').insert({
    tenant_id: input.tenantId,
    actor_id: input.actorId || null,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId || null,
    before_data: input.before === undefined ? null : sanitize(input.before),
    after_data: input.after === undefined ? null : sanitize(input.after),
    request_id: requestId,
    ip: getRequestIP(event, { xForwardedFor: true }) || null,
    user_agent: getHeader(event, 'user-agent') || null,
  })

  if (error)
    console.error('Falha ao registrar auditoria social', error.message)
}

export async function createSocialNotification(
  client: any,
  input: {
    tenantId: string
    userId: string
    type: string
    title: string
    body: string
    actionUrl?: string
    metadata?: Record<string, unknown>
  },
) {
  const { error } = await client.from('notifications').insert({
    tenant_id: input.tenantId,
    user_id: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    action_url: input.actionUrl || null,
    metadata: input.metadata || {},
  })

  if (error)
    console.error('Falha ao criar notificação social', error.message)
}
