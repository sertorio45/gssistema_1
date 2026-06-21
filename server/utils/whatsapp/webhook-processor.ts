import type { SupabaseClient } from '@supabase/supabase-js'

import { mapEvolutionConnectionState } from '~/server/utils/whatsapp/evolution-client'
import { broadcastWhatsAppEvent } from '~/server/utils/whatsapp/realtime-broadcast'
import { dispatchWhatsAppFlows } from '~/server/utils/whatsapp/flow-dispatcher'

function normalizePhone(jid: string): string {
  return jid.replace(/@.*/, '').replace(/\D/g, '')
}

function normalizeEvolutionEventName(raw: unknown): string {
  return String(raw || '')
    .toLowerCase()
    .replace(/_/g, '.')
    .replace(/-/g, '.')
}

function extractEvolutionMessages(payload: Record<string, any>): Record<string, any>[] {
  const data = payload.data
  if (!data)
    return []
  if (Array.isArray(data))
    return data.filter(Boolean)
  if (Array.isArray(data.messages))
    return data.messages.filter(Boolean)
  if (data.key || data.message)
    return [data]
  return []
}

function extractMessageText(message: Record<string, any> | undefined): string {
  if (!message)
    return ''

  const nested
    = message.ephemeralMessage?.message
      || message.viewOnceMessage?.message
      || message.documentWithCaptionMessage?.message

  const target = nested || message

  return String(
    target.conversation
    || target.extendedTextMessage?.text
    || target.imageMessage?.caption
    || target.videoMessage?.caption
    || target.buttonsResponseMessage?.selectedDisplayText
    || '',
  )
}

function resolveMessageRemoteJid(key: Record<string, any>): string {
  return String(key.remoteJidAlt || key.remoteJid || '')
}

function shouldIgnoreEvolutionJid(remoteJid: string): boolean {
  if (!remoteJid)
    return true
  return remoteJid.includes('status@broadcast') || remoteJid.endsWith('@broadcast')
}

async function upsertContact(
  client: SupabaseClient,
  tenantId: string,
  phone: string,
  name?: string,
) {
  const { data: existing } = await client
    .from('whatsapp_contact')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('phone', phone)
    .maybeSingle()

  if (existing?.id)
    return existing.id

  const { data: created, error } = await client
    .from('whatsapp_contact')
    .insert({
      tenant_id: tenantId,
      phone,
      name: name || phone,
      tags: [],
      custom_fields: {},
      opt_in: true,
      blocked: false,
    })
    .select('id')
    .single()

  if (error)
    throw error

  return created.id as string
}

async function upsertConversation(
  client: SupabaseClient,
  params: {
    tenantId: string
    instanceId: string
    contactId: string
    remoteJid: string
    contactName: string
    contactPhone: string
    lastMessagePreview: string
    lastMessageAt: string
    fromMe: boolean
  },
) {
  const { data: existing } = await client
    .from('whatsapp_conversation')
    .select('id, unread_count')
    .eq('tenant_id', params.tenantId)
    .eq('remote_jid', params.remoteJid)
    .maybeSingle()

  if (existing?.id) {
    const unread = params.fromMe ? (existing.unread_count ?? 0) : (existing.unread_count ?? 0) + 1
    const { data: updated } = await client
      .from('whatsapp_conversation')
      .update({
        instance_id: params.instanceId,
        contact_id: params.contactId,
        contact_name: params.contactName,
        contact_phone: params.contactPhone,
        last_message_preview: params.lastMessagePreview,
        last_message_at: params.lastMessageAt,
        unread_count: unread,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select('*')
      .single()

    if (updated) {
      await broadcastWhatsAppEvent(params.tenantId, 'conversation', updated)
    }

    return existing.id as string
  }

  const { data: created, error } = await client
    .from('whatsapp_conversation')
    .insert({
      tenant_id: params.tenantId,
      instance_id: params.instanceId,
      contact_id: params.contactId,
      remote_jid: params.remoteJid,
      contact_name: params.contactName,
      contact_phone: params.contactPhone,
      last_message_preview: params.lastMessagePreview,
      last_message_at: params.lastMessageAt,
      unread_count: params.fromMe ? 0 : 1,
      status: 'open',
      channel: 'whatsapp',
      is_online: false,
    })
    .select('*')
    .single()

  if (error)
    throw error

  if (created) {
    await broadcastWhatsAppEvent(params.tenantId, 'conversation', created)
  }

  return created.id as string
}

export async function processEvolutionWebhook(
  client: SupabaseClient,
  instance: Record<string, any>,
  payload: Record<string, any>,
) {
  const tenantId = instance.tenant_id as string
  const instanceId = instance.id as string
  const event = normalizeEvolutionEventName(payload.event || payload.type)

  if (event === 'connection.update') {
    const mapped = mapEvolutionConnectionState(payload.data || payload)
    await client
      .from('whatsapp_instance')
      .update({
        status: mapped.status,
        phone_number: mapped.phoneNumber || instance.phone_number,
        connection_state: payload.data || payload,
        qr_code: mapped.status === 'connected' ? null : instance.qr_code,
        updated_at: new Date().toISOString(),
      })
      .eq('id', instanceId)

    return { handled: true, type: 'connection' }
  }

  if (event === 'messages.upsert') {
    const messages = extractEvolutionMessages(payload)

    for (const item of messages) {
      if (!item?.key)
        continue

      const remoteJid = resolveMessageRemoteJid(item.key)
      if (shouldIgnoreEvolutionJid(remoteJid))
        continue

      const fromMe = Boolean(item.key.fromMe)
      const phone = normalizePhone(remoteJid)
      const pushName = String(item.pushName || phone)
      const messageId = String(item.key.id || '')
      const timestamp = item.messageTimestamp
        ? new Date(Number(item.messageTimestamp) * 1000).toISOString()
        : new Date().toISOString()

      const text = extractMessageText(item.message)

      const contactId = await upsertContact(client, tenantId, phone, pushName)
      const conversationId = await upsertConversation(client, {
        tenantId,
        instanceId,
        contactId,
        remoteJid,
        contactName: pushName,
        contactPhone: phone,
        lastMessagePreview: text || '[mídia]',
        lastMessageAt: timestamp,
        fromMe,
      })

      const { data: existingMsg } = await client
        .from('whatsapp_message')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('external_id', messageId)
        .maybeSingle()

      if (!existingMsg?.id) {
        const { data: inserted } = await client.from('whatsapp_message').insert({
          tenant_id: tenantId,
          conversation_id: conversationId,
          instance_id: instanceId,
          contact_id: contactId,
          external_id: messageId,
          remote_jid: remoteJid,
          from_me: fromMe,
          message_type: item.messageType || 'text',
          content: text,
          media_url: item.message?.imageMessage?.url || null,
          status: fromMe ? 'sent' : 'delivered',
          sent_at: timestamp,
          metadata: {},
        }).select('*').single()

        if (inserted) {
          await broadcastWhatsAppEvent(tenantId, 'message', inserted)

          if (!fromMe) {
            try {
              await dispatchWhatsAppFlows(client, {
                tenantId,
                instanceId,
                contactId,
                conversationId,
                remoteJid,
                messageId: inserted.id as string,
                messageContent: text,
                messageType: String(item.messageType || 'text'),
                fromMe,
                sentAt: timestamp,
                contactPhone: phone,
                contactName: pushName,
              })
            }
            catch (err: any) {
              console.error('[WhatsApp] Flow dispatch failed:', err?.message || err)
            }
          }
        }
      }
      else if (!fromMe) {
        // Message already stored (duplicate webhook) — still attempt flow dispatch.
        try {
          await dispatchWhatsAppFlows(client, {
            tenantId,
            instanceId,
            contactId,
            conversationId,
            remoteJid,
            messageId: existingMsg.id as string,
            messageContent: text,
            messageType: String(item.messageType || 'text'),
            fromMe,
            sentAt: timestamp,
            contactPhone: phone,
            contactName: pushName,
          })
        }
        catch (err: any) {
          console.error('[WhatsApp] Flow dispatch failed (existing message):', err?.message || err)
        }
      }
    }

    return { handled: true, type: 'message' }
  }

  if (event === 'messages.update') {
    const updates = Array.isArray(payload.data) ? payload.data : [payload.data]
    for (const item of updates) {
      const messageId = String(item?.key?.id || '')
      const status = String(item?.update?.status || item?.status || '').toLowerCase()
      if (!messageId || !status)
        continue

      const mappedStatus
        = status === 'read' ? 'read'
          : status === 'delivery_ack' ? 'delivered'
            : status === 'server_ack' ? 'sent'
              : status

      const { data: updated } = await client
        .from('whatsapp_message')
        .update({ status: mappedStatus, updated_at: new Date().toISOString() })
        .eq('tenant_id', tenantId)
        .eq('external_id', messageId)
        .select('*')
        .maybeSingle()

      if (updated)
        await broadcastWhatsAppEvent(tenantId, 'message', updated)
    }

    return { handled: true, type: 'status' }
  }

  return { handled: false, type: 'ignored' }
}

export async function processCloudWebhook(
  client: SupabaseClient,
  instance: Record<string, any>,
  payload: Record<string, any>,
) {
  const tenantId = instance.tenant_id as string
  const instanceId = instance.id as string
  const entry = payload.entry?.[0]
  const changes = entry?.changes?.[0]
  const value = changes?.value

  if (!value)
    return { handled: false, type: 'ignored' }

  if (value.messages?.length) {
    for (const msg of value.messages) {
      const phone = String(msg.from || '')
      const remoteJid = `${phone}@s.whatsapp.net`
      const contactName = value.contacts?.[0]?.profile?.name || phone
      const text = msg.text?.body || msg.button?.text || ''
      const timestamp = msg.timestamp
        ? new Date(Number(msg.timestamp) * 1000).toISOString()
        : new Date().toISOString()

      const contactId = await upsertContact(client, tenantId, phone, contactName)
      const conversationId = await upsertConversation(client, {
        tenantId,
        instanceId,
        contactId,
        remoteJid,
        contactName,
        contactPhone: phone,
        lastMessagePreview: text || `[${msg.type}]`,
        lastMessageAt: timestamp,
        fromMe: false,
      })

      const { data: inserted } = await client.from('whatsapp_message').insert({
        tenant_id: tenantId,
        conversation_id: conversationId,
        instance_id: instanceId,
        contact_id: contactId,
        external_id: String(msg.id),
        remote_jid: remoteJid,
        from_me: false,
        message_type: msg.type || 'text',
        content: text,
        status: 'delivered',
        sent_at: timestamp,
        metadata: {},
      }).select('*').single()

      if (inserted) {
        await broadcastWhatsAppEvent(tenantId, 'message', inserted)
      }
    }

    return { handled: true, type: 'message' }
  }

  if (value.statuses?.length) {
    for (const st of value.statuses) {
      const mappedStatus = st.status === 'read' ? 'read' : st.status === 'delivered' ? 'delivered' : 'sent'
      const { data: updated } = await client
        .from('whatsapp_message')
        .update({ status: mappedStatus })
        .eq('tenant_id', tenantId)
        .eq('external_id', String(st.id))
        .select('*')
        .maybeSingle()

      if (updated)
        await broadcastWhatsAppEvent(tenantId, 'message', updated)
    }

    return { handled: true, type: 'status' }
  }

  return { handled: false, type: 'ignored' }
}
