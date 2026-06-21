import type { SupabaseClient } from '@supabase/supabase-js'

import type { WhatsAppCampaignAudienceFilter, WhatsAppCampaignStats } from '~/types/whatsapp'
import { sendWhatsAppTextMessage } from '~/server/utils/whatsapp/message-sender'
import { broadcastWhatsAppEvent } from '~/server/utils/whatsapp/realtime-broadcast'

const SEND_DELAY_MS = 2500

interface AudienceContact {
  id: string
  phone: string
  name?: string | null
  tags?: string[]
  opt_in?: boolean
  blocked?: boolean
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, '')
}

function personalizeMessage(template: string, contact: AudienceContact) {
  return template
    .replace(/\{nome\}/gi, contact.name || contact.phone)
    .replace(/\{telefone\}/gi, contact.phone)
}

export async function resolveAudienceContacts(
  client: SupabaseClient,
  tenantId: string,
  filter: WhatsAppCampaignAudienceFilter,
): Promise<AudienceContact[]> {
  let query = client
    .from('whatsapp_contact')
    .select('id, phone, name, tags, opt_in, blocked')
    .eq('tenant_id', tenantId)

  if (filter.exclude_blocked !== false)
    query = query.eq('blocked', false)

  if (filter.opt_in_only !== false)
    query = query.eq('opt_in', true)

  if (filter.audience_type === 'selected' && filter.contact_ids?.length) {
    query = query.in('id', filter.contact_ids)
  }

  const { data, error } = await query
  if (error)
    throw error

  let contacts = (data || []) as AudienceContact[]

  if (filter.audience_type === 'tags' && filter.tags?.length) {
    const tagSet = new Set(filter.tags.map(t => t.toLowerCase()))
    contacts = contacts.filter(c =>
      (c.tags || []).some(tag => tagSet.has(String(tag).toLowerCase())),
    )
  }

  const unique = new Map<string, AudienceContact>()
  for (const contact of contacts) {
    const phone = normalizePhone(contact.phone)
    if (!phone)
      continue
    unique.set(phone, { ...contact, phone })
  }

  return Array.from(unique.values())
}

export async function refreshCampaignStats(
  client: SupabaseClient,
  campaignId: string,
  tenantId: string,
): Promise<WhatsAppCampaignStats> {
  const { data: recipients } = await client
    .from('whatsapp_campaign_recipient')
    .select('status')
    .eq('campaign_id', campaignId)
    .eq('tenant_id', tenantId)

  const stats: WhatsAppCampaignStats = {
    total: recipients?.length || 0,
    sent: 0,
    failed: 0,
    pending: 0,
    skipped: 0,
  }

  for (const row of recipients || []) {
    if (row.status === 'sent')
      stats.sent! += 1
    else if (row.status === 'failed')
      stats.failed! += 1
    else if (row.status === 'skipped')
      stats.skipped! += 1
    else
      stats.pending! += 1
  }

  await client
    .from('whatsapp_campaign')
    .update({ stats, updated_at: new Date().toISOString() })
    .eq('id', campaignId)
    .eq('tenant_id', tenantId)

  return stats
}

async function getCampaignStatus(client: SupabaseClient, campaignId: string, tenantId: string) {
  const { data } = await client
    .from('whatsapp_campaign')
    .select('status')
    .eq('id', campaignId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  return data?.status as string | undefined
}

async function sendToRecipient(
  client: SupabaseClient,
  params: {
    tenantId: string
    campaignId: string
    instance: Record<string, any>
    integration: Record<string, any>
    recipientId: string
    contact: AudienceContact
    message: string
  },
) {
  const phone = normalizePhone(params.contact.phone)
  const remoteJid = `${phone}@s.whatsapp.net`
  const now = new Date().toISOString()

  const providerResult = await sendWhatsAppTextMessage({
    instance: params.instance,
    integration: params.integration,
    phone,
    text: params.message,
  }) as any

  const externalId
    = providerResult?.key?.id
      || providerResult?.messages?.[0]?.id
      || null

  let conversationId: string | null = null
  const { data: existingConv } = await client
    .from('whatsapp_conversation')
    .select('id')
    .eq('tenant_id', params.tenantId)
    .eq('remote_jid', remoteJid)
    .maybeSingle()

  if (existingConv?.id) {
    conversationId = existingConv.id
    await client
      .from('whatsapp_conversation')
      .update({
        instance_id: params.instance.id,
        contact_id: params.contact.id,
        contact_name: params.contact.name || phone,
        contact_phone: phone,
        last_message_preview: params.message.slice(0, 120),
        last_message_at: now,
        updated_at: now,
      })
      .eq('id', conversationId)
  }
  else {
    const { data: createdConv } = await client
      .from('whatsapp_conversation')
      .insert({
        tenant_id: params.tenantId,
        instance_id: params.instance.id,
        contact_id: params.contact.id,
        remote_jid: remoteJid,
        contact_name: params.contact.name || phone,
        contact_phone: phone,
        last_message_preview: params.message.slice(0, 120),
        last_message_at: now,
        unread_count: 0,
        status: 'open',
        channel: 'whatsapp',
        is_online: false,
      })
      .select('*')
      .single()

    conversationId = createdConv?.id || null
    if (createdConv)
      await broadcastWhatsAppEvent(params.tenantId, 'conversation', createdConv)
  }

  const { data: messageRow } = await client
    .from('whatsapp_message')
    .insert({
      tenant_id: params.tenantId,
      conversation_id: conversationId,
      instance_id: params.instance.id,
      contact_id: params.contact.id,
      external_id: externalId,
      remote_jid: remoteJid,
      from_me: true,
      message_type: 'text',
      content: params.message,
      status: 'sent',
      sent_at: now,
      metadata: { campaign_id: params.campaignId },
    })
    .select('*')
    .single()

  if (messageRow)
    await broadcastWhatsAppEvent(params.tenantId, 'message', messageRow)

  await client
    .from('whatsapp_campaign_recipient')
    .update({
      status: 'sent',
      sent_at: now,
      external_message_id: externalId,
      error_message: null,
      updated_at: now,
    })
    .eq('id', params.recipientId)
}

export async function buildCampaignRecipients(
  client: SupabaseClient,
  campaignId: string,
  tenantId: string,
  filter: WhatsAppCampaignAudienceFilter,
) {
  await client
    .from('whatsapp_campaign_recipient')
    .delete()
    .eq('campaign_id', campaignId)
    .eq('tenant_id', tenantId)

  const contacts = await resolveAudienceContacts(client, tenantId, filter)
  if (!contacts.length)
    return { total: 0 }

  const rows = contacts.map(contact => ({
    tenant_id: tenantId,
    campaign_id: campaignId,
    contact_id: contact.id,
    phone: normalizePhone(contact.phone),
    status: 'pending',
  }))

  const { error } = await client.from('whatsapp_campaign_recipient').insert(rows)
  if (error)
    throw error

  const stats = await refreshCampaignStats(client, campaignId, tenantId)
  return { total: stats.total || 0 }
}

export async function processCampaignSend(
  client: SupabaseClient,
  campaignId: string,
  tenantId: string,
) {
  const { data: campaign, error: campaignError } = await client
    .from('whatsapp_campaign')
    .select('*')
    .eq('id', campaignId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (campaignError || !campaign)
    return

  const filter = (campaign.audience_filter || {}) as WhatsAppCampaignAudienceFilter
  const messageTemplate = filter.message?.trim()
  if (!messageTemplate)
    return

  if (!campaign.instance_id)
    return

  const { data: instance, error: instanceError } = await client
    .from('whatsapp_instance')
    .select('*')
    .eq('id', campaign.instance_id)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (instanceError || !instance)
    return

  const { data: integration } = await client
    .from('whatsapp_integration')
    .select('*')
    .eq('instance_id', campaign.instance_id)
    .maybeSingle()

  if (!integration)
    return

  if (instance.provider !== 'evolution' || instance.status !== 'connected') {
    await client
      .from('whatsapp_campaign')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaignId)
    return
  }

  while (true) {
    const status = await getCampaignStatus(client, campaignId, tenantId)
    if (status === 'paused')
      break

    if (status !== 'running')
      break

    const { data: pendingRecipients } = await client
      .from('whatsapp_campaign_recipient')
      .select('id, contact_id, phone, whatsapp_contact:contact_id (id, phone, name, tags, opt_in, blocked)')
      .eq('campaign_id', campaignId)
      .eq('tenant_id', tenantId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)

    const recipient = pendingRecipients?.[0]
    if (!recipient)
      break

    const rawContact = recipient.whatsapp_contact as AudienceContact | AudienceContact[] | null
    const contactRow = Array.isArray(rawContact) ? rawContact[0] : rawContact
    const contact: AudienceContact = contactRow || {
      id: recipient.contact_id || recipient.id,
      phone: recipient.phone,
      name: recipient.phone,
    }

    try {
      const personalized = personalizeMessage(messageTemplate, contact)
      await sendToRecipient(client, {
        tenantId,
        campaignId,
        instance,
        integration,
        recipientId: recipient.id,
        contact,
        message: personalized,
      })
    }
    catch (error: any) {
      await client
        .from('whatsapp_campaign_recipient')
        .update({
          status: 'failed',
          error_message: error?.statusMessage || error?.message || 'Send failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', recipient.id)
    }

    await refreshCampaignStats(client, campaignId, tenantId)
    await sleep(SEND_DELAY_MS)
  }

  const finalStatus = await getCampaignStatus(client, campaignId, tenantId)
  if (finalStatus === 'running') {
    const stats = await refreshCampaignStats(client, campaignId, tenantId)
    const hasPending = (stats.pending || 0) > 0
    await client
      .from('whatsapp_campaign')
      .update({
        status: hasPending ? 'paused' : 'completed',
        completed_at: hasPending ? null : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaignId)
      .eq('tenant_id', tenantId)
  }
}
