import type { SupabaseClient } from '@supabase/supabase-js'

import { normalizePhone } from '~/server/utils/whatsapp/contact-utils'
import { broadcastWhatsAppEvent } from '~/server/utils/whatsapp/realtime-broadcast'

import type { WhatsAppConversationStatus } from '~/types/whatsapp'

export const ACTIVE_WHATSAPP_CONVERSATION_STATUSES: WhatsAppConversationStatus[] = ['open', 'pending']

export function isActiveWhatsAppConversationStatus(status: string | null | undefined): boolean {
  return ACTIVE_WHATSAPP_CONVERSATION_STATUSES.includes(status as WhatsAppConversationStatus)
}

export function buildWhatsAppRemoteJid(phoneOrJid: string): string {
  const phone = normalizePhone(phoneOrJid)
  return `${phone}@s.whatsapp.net`
}

export function resolveEvolutionRemoteJid(key: Record<string, unknown>): string {
  const raw = String(key.remoteJidAlt || key.remoteJid || '')
  return buildWhatsAppRemoteJid(raw)
}

interface UpsertConversationParams {
  tenantId: string
  instanceId: string
  contactId: string
  contactPhone: string
  contactName: string
  remoteJid?: string
  lastMessagePreview: string
  lastMessageAt: string
  fromMe: boolean
}

export async function findOrUpsertWhatsAppConversation(
  client: SupabaseClient,
  params: UpsertConversationParams,
): Promise<string> {
  const phone = normalizePhone(params.contactPhone)
  const remoteJid = buildWhatsAppRemoteJid(params.remoteJid || phone)
  const now = new Date().toISOString()

  const { data: existing } = await client
    .from('whatsapp_conversation')
    .select('id, unread_count')
    .eq('tenant_id', params.tenantId)
    .eq('contact_phone', phone)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle()

  const unreadCount = existing
    ? (params.fromMe ? (existing.unread_count ?? 0) : (existing.unread_count ?? 0) + 1)
    : (params.fromMe ? 0 : 1)

  const payload = {
    instance_id: params.instanceId,
    contact_id: params.contactId,
    contact_name: params.contactName || phone,
    contact_phone: phone,
    remote_jid: remoteJid,
    last_message_preview: params.lastMessagePreview,
    last_message_at: params.lastMessageAt,
    unread_count: unreadCount,
    updated_at: now,
  }

  if (existing?.id) {
    const { data: updated } = await client
      .from('whatsapp_conversation')
      .update(payload)
      .eq('id', existing.id)
      .select('*')
      .single()

    if (updated)
      await broadcastWhatsAppEvent(params.tenantId, 'conversation', updated)

    return existing.id as string
  }

  const { data: created, error } = await client
    .from('whatsapp_conversation')
    .insert({
      tenant_id: params.tenantId,
      ...payload,
      status: 'open',
      channel: 'whatsapp',
      is_online: false,
    })
    .select('*')
    .single()

  if (error?.code === '23505') {
    const { data: retry } = await client
      .from('whatsapp_conversation')
      .select('id')
      .eq('tenant_id', params.tenantId)
      .eq('contact_phone', phone)
      .maybeSingle()

    if (retry?.id) {
      const { data: updated } = await client
        .from('whatsapp_conversation')
        .update(payload)
        .eq('id', retry.id)
        .select('*')
        .single()

      if (updated)
        await broadcastWhatsAppEvent(params.tenantId, 'conversation', updated)

      return retry.id as string
    }
  }

  if (error)
    throw error

  if (created)
    await broadcastWhatsAppEvent(params.tenantId, 'conversation', created)

  return created!.id as string
}

export function dedupeConversationRows<T extends { contact_phone?: string | null, last_message_at?: string | null, created_at?: string | null }>(
  rows: T[],
): T[] {
  const byPhone = new Map<string, T>()

  for (const row of rows) {
    const phone = normalizePhone(String(row.contact_phone || ''))
    if (!phone)
      continue

    const current = byPhone.get(phone)
    if (!current) {
      byPhone.set(phone, row)
      continue
    }

    const currentTime = new Date(current.last_message_at || current.created_at || 0).getTime()
    const rowTime = new Date(row.last_message_at || row.created_at || 0).getTime()
    if (rowTime >= currentTime)
      byPhone.set(phone, row)
  }

  return Array.from(byPhone.values()).sort((a, b) => {
    const aTime = new Date(a.last_message_at || a.created_at || 0).getTime()
    const bTime = new Date(b.last_message_at || b.created_at || 0).getTime()
    return bTime - aTime
  })
}
