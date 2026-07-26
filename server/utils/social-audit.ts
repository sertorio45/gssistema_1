import { recordAuditEvent, writeAuditEvent } from '~/server/utils/audit-events'

export async function writeSocialAudit(
  client: any,
  input: {
    tenantId: string
    actorId?: string | null
    action: string
    entityType: string
    entityId?: string | null
    before?: unknown
    after?: unknown
    requestId?: string | null
    ip?: string | null
    userAgent?: string | null
  },
) {
  await writeAuditEvent(client, input)
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
  await recordAuditEvent(event, client, input)
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
    /**
     * When present, the notification is deduplicated per tenant via the unique
     * `notifications (tenant_id, idempotency_key)` index. Re-runs of the same
     * workflow step become no-ops instead of spamming approvers.
     */
    idempotencyKey?: string | null
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
    idempotency_key: input.idempotencyKey || null,
  })

  // 23505 = unique_violation: the idempotency key already produced this
  // notification, so silently skip the duplicate.
  if (error && String((error as any).code) !== '23505')
    console.error('Falha ao criar notificação social', error.message)
}
