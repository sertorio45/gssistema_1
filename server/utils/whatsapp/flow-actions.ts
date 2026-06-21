import type { SupabaseClient } from '@supabase/supabase-js'

import { syncWhatsAppContactToCrm } from '~/server/utils/whatsapp/crm-sync'
import { broadcastWhatsAppEvent } from '~/server/utils/whatsapp/realtime-broadcast'

async function ensureWhatsAppTag(
  client: SupabaseClient,
  tenantId: string,
  tagName: string,
): Promise<string | null> {
  const name = tagName.trim()
  if (!name)
    return null

  const { data: existing } = await client
    .from('whatsapp_tag')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('name', name)
    .maybeSingle()

  if (existing?.id)
    return existing.id

  const { data: created, error } = await client
    .from('whatsapp_tag')
    .insert({
      tenant_id: tenantId,
      name,
    })
    .select('id')
    .single()

  if (error || !created)
    return null

  return created.id as string
}

export async function applyFlowTag(
  client: SupabaseClient,
  params: {
    tenantId: string
    contactId: string | null
    conversationId: string | null
    tagName: string
    action: 'add' | 'remove'
    target: 'contact' | 'conversation'
  },
) {
  const tagId = await ensureWhatsAppTag(client, params.tenantId, params.tagName)
  if (!tagId)
    throw new Error('Tag name is required')

  if (params.target === 'conversation') {
    if (!params.conversationId)
      throw new Error('Conversation is required for conversation tags')

    if (params.action === 'remove') {
      await client
        .from('whatsapp_conversation_tag')
        .delete()
        .eq('conversation_id', params.conversationId)
        .eq('tag_id', tagId)

      return { tagId, tagName: params.tagName, target: 'conversation', action: 'remove' }
    }

    await client
      .from('whatsapp_conversation_tag')
      .upsert({
        conversation_id: params.conversationId,
        tag_id: tagId,
        tenant_id: params.tenantId,
      })

    return { tagId, tagName: params.tagName, target: 'conversation', action: 'add' }
  }

  if (!params.contactId)
    throw new Error('Contact is required for contact tags')

  if (params.action === 'remove') {
    await client
      .from('whatsapp_contact_tag')
      .delete()
      .eq('contact_id', params.contactId)
      .eq('tag_id', tagId)

    return { tagId, tagName: params.tagName, target: 'contact', action: 'remove' }
  }

  await client
    .from('whatsapp_contact_tag')
    .upsert({
      contact_id: params.contactId,
      tag_id: tagId,
      tenant_id: params.tenantId,
    })

  return { tagId, tagName: params.tagName, target: 'contact', action: 'add' }
}

export async function applyFlowCrmUpdate(
  client: SupabaseClient,
  params: {
    tenantId: string
    contactId: string | null
    createIfMissing: boolean
  },
) {
  if (!params.contactId)
    throw new Error('Contact is required for CRM sync')

  const { data: contact, error } = await client
    .from('whatsapp_contact')
    .select('*')
    .eq('id', params.contactId)
    .eq('tenant_id', params.tenantId)
    .maybeSingle()

  if (error || !contact)
    throw new Error('WhatsApp contact not found')

  const crmContact = await syncWhatsAppContactToCrm(
    client,
    params.tenantId,
    contact,
    { createIfMissing: params.createIfMissing },
  )

  return {
    crmContactId: crmContact.id,
    crmContactName: crmContact.name,
  }
}

export async function applyFlowHandoff(
  client: SupabaseClient,
  params: {
    tenantId: string
    conversationId: string | null
    status: 'open' | 'pending' | 'resolved' | 'spam'
    assignToUserId?: string | null
    note?: string | null
  },
) {
  if (!params.conversationId)
    throw new Error('Conversation is required for handoff')

  const now = new Date().toISOString()
  const update: Record<string, unknown> = {
    status: params.status,
    updated_at: now,
  }

  if (params.assignToUserId !== undefined)
    update.assigned_to = params.assignToUserId || null

  const { data: conversation, error } = await client
    .from('whatsapp_conversation')
    .update(update)
    .eq('id', params.conversationId)
    .eq('tenant_id', params.tenantId)
    .select('*')
    .single()

  if (error || !conversation)
    throw new Error(error?.message || 'Failed to update conversation')

  if (params.assignToUserId) {
    await client.from('whatsapp_assignment').insert({
      tenant_id: params.tenantId,
      conversation_id: params.conversationId,
      user_id: params.assignToUserId,
    })
  }

  await broadcastWhatsAppEvent(params.tenantId, 'conversation', conversation)

  return {
    conversationId: params.conversationId,
    status: params.status,
    assignedTo: params.assignToUserId || null,
    note: params.note || null,
  }
}
