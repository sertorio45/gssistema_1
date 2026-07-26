import { randomUUID } from 'node:crypto'

import { getHeader, getRequestIP } from 'h3'

const SENSITIVE_KEYS = /token|secret|password|authorization|credential/i

/** Drops credential-shaped keys before anything reaches `audit_events`. */
export function sanitizeAuditPayload(value: unknown): unknown {
  if (Array.isArray(value))
    return value.map(sanitizeAuditPayload)

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !SENSITIVE_KEYS.test(key))
        .map(([key, nested]) => [key, sanitizeAuditPayload(nested)]),
    )
  }

  return value
}

export interface AuditEventInput {
  /** Null for platform-wide actions that are not bound to a single workspace. */
  tenantId?: string | null
  organizationId?: string | null
  actorId?: string | null
  action: string
  entityType: string
  entityId?: string | null
  before?: unknown
  after?: unknown
  requestId?: string | null
  ip?: string | null
  userAgent?: string | null
}

export async function writeAuditEvent(client: any, input: AuditEventInput) {
  const { error } = await client.from('audit_events').insert({
    tenant_id: input.tenantId || null,
    organization_id: input.organizationId || null,
    actor_id: input.actorId || null,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId || null,
    before_data: input.before === undefined ? null : sanitizeAuditPayload(input.before),
    after_data: input.after === undefined ? null : sanitizeAuditPayload(input.after),
    request_id: input.requestId || randomUUID(),
    ip: input.ip || null,
    user_agent: input.userAgent || null,
  })

  if (error)
    console.error('Falha ao registrar auditoria', error.message)
}

/** Same as `writeAuditEvent`, enriched with request metadata. */
export async function recordAuditEvent(
  event: any,
  client: any,
  input: Omit<AuditEventInput, 'requestId' | 'ip' | 'userAgent'>,
) {
  await writeAuditEvent(client, {
    ...input,
    requestId: getHeader(event, 'x-request-id') || randomUUID(),
    ip: getRequestIP(event, { xForwardedFor: true }) || null,
    userAgent: getHeader(event, 'user-agent') || null,
  })
}
