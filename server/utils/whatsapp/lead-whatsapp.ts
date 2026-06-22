import type { SupabaseClient } from '@supabase/supabase-js'
import { createError } from 'h3'

import {
  formatBrazilianMobilePhone,
  isValidBrazilianMobilePhone,
  normalizePhone,
} from '~/server/utils/whatsapp/contact-utils'
import {
  ACTIVE_WHATSAPP_CONVERSATION_STATUSES,
  findOrUpsertWhatsAppConversation,
  isActiveWhatsAppConversationStatus,
} from '~/server/utils/whatsapp/conversation-utils'

export interface LeadWhatsAppResolution {
  conversationId: string
  phone: string
  linked: boolean
  reopened: boolean
}

async function getDefaultWhatsAppInstanceId(
  client: SupabaseClient,
  tenantId: string,
): Promise<string | null> {
  const { data: instance } = await client
    .from('whatsapp_instance')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('status', 'connected')
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  return instance?.id ? String(instance.id) : null
}

async function findActiveConversation(
  client: SupabaseClient,
  tenantId: string,
  params: { leadId?: string, phone?: string },
) {
  let query = client
    .from('whatsapp_conversation')
    .select('id, status, lead_id')
    .eq('tenant_id', tenantId)
    .in('status', ACTIVE_WHATSAPP_CONVERSATION_STATUSES)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(1)

  if (params.leadId)
    query = query.eq('lead_id', params.leadId)
  else if (params.phone)
    query = query.eq('contact_phone', params.phone)
  else
    return null

  const { data } = await query.maybeSingle()
  return data
}

async function findInactiveConversationByPhone(
  client: SupabaseClient,
  tenantId: string,
  phone: string,
) {
  const { data } = await client
    .from('whatsapp_conversation')
    .select('id, status, lead_id')
    .eq('tenant_id', tenantId)
    .eq('contact_phone', phone)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle()

  if (!data?.id || isActiveWhatsAppConversationStatus(data.status))
    return null

  return data
}

export async function resolveLeadWhatsAppConversation(
  client: SupabaseClient,
  tenantId: string,
  leadId: string,
): Promise<LeadWhatsAppResolution> {
  const { data: lead, error: leadError } = await client
    .from('crm_lead')
    .select('id, name, tenant_id, crm_contact(id, phone, name, email)')
    .eq('id', leadId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (leadError)
    throw createError({ statusCode: 400, statusMessage: leadError.message })

  if (!lead)
    throw createError({ statusCode: 404, statusMessage: 'Lead not found' })

  const contacts = lead.crm_contact as Array<{ id?: string, phone?: string | null, name?: string | null, email?: string | null }> | null
  const primaryContact = Array.isArray(contacts) ? contacts[0] : null
  const rawPhone = primaryContact?.phone?.trim() || null

  if (!isValidBrazilianMobilePhone(rawPhone)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Informe um celular válido (DDD + 9 dígitos) no contato do lead.',
    })
  }

  const phone = formatBrazilianMobilePhone(rawPhone)!
  const now = new Date().toISOString()
  let linked = false
  let reopened = false

  let conversation = await findActiveConversation(client, tenantId, { leadId })

  if (!conversation?.id) {
    conversation = await findActiveConversation(client, tenantId, { phone })
    if (conversation?.id)
      linked = true
  }

  if (!conversation?.id) {
    const inactive = await findInactiveConversationByPhone(client, tenantId, phone)
    if (inactive?.id) {
      const { data: reopenedConversation, error: reopenError } = await client
        .from('whatsapp_conversation')
        .update({
          status: 'open',
          lead_id: leadId,
          updated_at: now,
        })
        .eq('id', inactive.id)
        .eq('tenant_id', tenantId)
        .select('id, status, lead_id')
        .single()

      if (reopenError)
        throw createError({ statusCode: 400, statusMessage: reopenError.message })

      conversation = reopenedConversation
      linked = true
      reopened = true
    }
  }

  if (!conversation?.id) {
    const instanceId = await getDefaultWhatsAppInstanceId(client, tenantId)
    if (!instanceId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Nenhuma instância WhatsApp conectada. Configure o WhatsApp antes de abrir a conversa.',
      })
    }

    let whatsappContactId: string | null = null
    const { data: existingContact } = await client
      .from('whatsapp_contact')
      .select('id, crm_contact_id')
      .eq('tenant_id', tenantId)
      .eq('phone', phone)
      .maybeSingle()

    if (existingContact?.id) {
      whatsappContactId = existingContact.id as string
      if (primaryContact?.id && !existingContact.crm_contact_id) {
        await client
          .from('whatsapp_contact')
          .update({ crm_contact_id: primaryContact.id, updated_at: now })
          .eq('id', existingContact.id)
      }
    }
    else {
      const { data: createdContact, error: contactError } = await client
        .from('whatsapp_contact')
        .insert({
          tenant_id: tenantId,
          phone,
          name: primaryContact?.name || lead.name || phone,
          crm_contact_id: primaryContact?.id || null,
          opt_in: true,
          opt_in_at: now,
          blocked: false,
          tags: [],
          custom_fields: {},
        })
        .select('id')
        .single()

      if (contactError || !createdContact?.id) {
        throw createError({
          statusCode: 400,
          statusMessage: contactError?.message || 'Falha ao criar contato WhatsApp',
        })
      }

      whatsappContactId = createdContact.id as string
    }

    const conversationId = await findOrUpsertWhatsAppConversation(client, {
      tenantId,
      instanceId,
      contactId: whatsappContactId,
      contactPhone: phone,
      contactName: String(primaryContact?.name || lead.name || phone),
      lastMessagePreview: 'Conversa iniciada pelo CRM',
      lastMessageAt: now,
      fromMe: false,
    })

    await client
      .from('whatsapp_conversation')
      .update({
        lead_id: leadId,
        crm_contact_id: primaryContact?.id || null,
        status: 'open',
        updated_at: now,
      })
      .eq('id', conversationId)
      .eq('tenant_id', tenantId)

    conversation = { id: conversationId, status: 'open', lead_id: leadId }
    linked = true
  }

  if (conversation.lead_id !== leadId || linked) {
    await client
      .from('whatsapp_conversation')
      .update({
        lead_id: leadId,
        crm_contact_id: primaryContact?.id || null,
        updated_at: now,
      })
      .eq('id', conversation.id)
      .eq('tenant_id', tenantId)

    if (primaryContact?.id) {
      await client
        .from('crm_contact')
        .update({ lead_id: leadId, phone: rawPhone, updated_at: now })
        .eq('id', primaryContact.id)
        .eq('tenant_id', tenantId)
    }
  }

  return {
    conversationId: String(conversation.id),
    phone,
    linked,
    reopened,
  }
}

export function getLeadPhoneFromRow(
  lead: Record<string, unknown>,
): string | null {
  const directPhone = typeof lead.phone === 'string' ? lead.phone : null
  if (directPhone?.trim())
    return directPhone.trim()

  const contacts = lead.crm_contact as Array<{ phone?: string | null }> | null
  const primaryContact = Array.isArray(contacts) ? contacts[0] : null
  return primaryContact?.phone?.trim() || null
}

export function attachActiveWhatsAppConversation<T extends Record<string, unknown>>(
  lead: T,
  conversationByLeadId: Map<string, { id: string, status: string }>,
): T & { whatsapp_conversation_id: string | null, whatsapp_conversation_status: string | null } {
  const phone = getLeadPhoneFromRow(lead)
  const linkedConversation = isValidBrazilianMobilePhone(phone)
    ? conversationByLeadId.get(String(lead.id))
    : null

  return {
    ...lead,
    whatsapp_conversation_id: linkedConversation?.id ?? null,
    whatsapp_conversation_status: linkedConversation?.status ?? null,
  }
}
