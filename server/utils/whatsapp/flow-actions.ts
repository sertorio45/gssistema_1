import type { SupabaseClient } from '@supabase/supabase-js'

import { syncWhatsAppContactToCrmWithLead } from '~/server/utils/whatsapp/crm-sync'
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
    conversationId?: string | null
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

  let existingLeadId: string | null = null
  if (params.conversationId) {
    const { data: conversation } = await client
      .from('whatsapp_conversation')
      .select('lead_id')
      .eq('id', params.conversationId)
      .eq('tenant_id', params.tenantId)
      .maybeSingle()

    existingLeadId = conversation?.lead_id as string | null
  }

  const crmContact = await syncWhatsAppContactToCrmWithLead(
    client,
    params.tenantId,
    contact,
    {
      createIfMissing: params.createIfMissing,
      conversationId: params.conversationId,
      existingLeadId,
    },
  )

  if (params.conversationId && crmContact.lead?.id) {
    await client
      .from('whatsapp_conversation')
      .update({
        crm_contact_id: crmContact.crmContact.id,
        lead_id: crmContact.lead.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.conversationId)
      .eq('tenant_id', params.tenantId)
  }

  return {
    crmContactId: crmContact.crmContact.id,
    crmContactName: crmContact.crmContact.name,
    leadId: crmContact.lead?.id ?? null,
    leadName: crmContact.lead?.name ?? null,
    leadCreated: crmContact.leadCreated,
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

export type FlowActionType
  = 'mark_read'
    | 'resolve_conversation'
    | 'set_priority'
    | 'block_contact'
    | 'unblock_contact'
    | 'opt_out'

export async function applyFlowAction(
  client: SupabaseClient,
  params: {
    tenantId: string
    contactId: string | null
    conversationId: string | null
    actionType: FlowActionType
    priority?: number
  },
) {
  const now = new Date().toISOString()

  if (params.actionType === 'mark_read') {
    if (!params.conversationId)
      throw new Error('Conversation is required')

    const { data: conversation } = await client
      .from('whatsapp_conversation')
      .update({ unread_count: 0, updated_at: now })
      .eq('id', params.conversationId)
      .eq('tenant_id', params.tenantId)
      .select('*')
      .single()

    if (conversation)
      await broadcastWhatsAppEvent(params.tenantId, 'conversation', conversation)

    return { actionType: params.actionType }
  }

  if (params.actionType === 'resolve_conversation') {
    if (!params.conversationId)
      throw new Error('Conversation is required')

    const { data: conversation } = await client
      .from('whatsapp_conversation')
      .update({ status: 'resolved', updated_at: now })
      .eq('id', params.conversationId)
      .eq('tenant_id', params.tenantId)
      .select('*')
      .single()

    if (conversation)
      await broadcastWhatsAppEvent(params.tenantId, 'conversation', conversation)

    return { actionType: params.actionType, status: 'resolved' }
  }

  if (params.actionType === 'set_priority') {
    if (!params.conversationId)
      throw new Error('Conversation is required')

    const priority = Math.min(Math.max(Number(params.priority ?? 1), 0), 5)
    await client
      .from('whatsapp_conversation')
      .update({ priority, updated_at: now })
      .eq('id', params.conversationId)
      .eq('tenant_id', params.tenantId)

    return { actionType: params.actionType, priority }
  }

  if (!params.contactId)
    throw new Error('Contact is required')

  if (params.actionType === 'block_contact') {
    await client
      .from('whatsapp_contact')
      .update({ blocked: true, updated_at: now })
      .eq('id', params.contactId)
      .eq('tenant_id', params.tenantId)

    return { actionType: params.actionType, blocked: true }
  }

  if (params.actionType === 'unblock_contact') {
    await client
      .from('whatsapp_contact')
      .update({ blocked: false, updated_at: now })
      .eq('id', params.contactId)
      .eq('tenant_id', params.tenantId)

    return { actionType: params.actionType, blocked: false }
  }

  if (params.actionType === 'opt_out') {
    await client
      .from('whatsapp_contact')
      .update({ opt_in: false, updated_at: now })
      .eq('id', params.contactId)
      .eq('tenant_id', params.tenantId)

    return { actionType: params.actionType, optIn: false }
  }

  throw new Error('Unsupported action type')
}
