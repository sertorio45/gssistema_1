import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { isWrongTenantForScopedUser } from '~/server/utils/tenant-access'
import { createError, getQuery } from 'h3'

import {
  formatBrazilianMobilePhone,
  isValidBrazilianMobilePhone,
} from '~/server/utils/whatsapp/contact-utils'
import { isActiveWhatsAppConversationStatus } from '~/server/utils/whatsapp/conversation-utils'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const leadId = getRouterParam(event, 'id')
  if (!leadId) {
    throw createError({ statusCode: 400, statusMessage: 'Lead ID is required' })
  }

  const tenantRoles = user.app_metadata?.tenant_roles || {}
  let tenantId = event.context.auth?.tenantId as string | undefined
  if (!tenantId) {
    const firstTenant = Object.keys(tenantRoles)[0]
    if (firstTenant)
      tenantId = firstTenant
  }

  const { tenant_id: queryTenantId } = getQuery(event)
  const effectiveTenantId = (queryTenantId as string) || tenantId
  if (!effectiveTenantId) {
    throw createError({ statusCode: 400, statusMessage: 'Tenant ID is required' })
  }

  const role = tenantId && tenantRoles[tenantId]
    ? tenantRoles[tenantId]
    : user.user_metadata?.role || user.app_metadata?.role

  if (isWrongTenantForScopedUser(role, tenantId, effectiveTenantId)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const client = serverSupabaseServiceRole(event)

  const { data: lead, error: leadError } = await client
    .from('crm_lead')
    .select('id, tenant_id, crm_contact(phone)')
    .eq('id', leadId)
    .eq('tenant_id', effectiveTenantId)
    .maybeSingle()

  if (leadError) {
    throw createError({ statusCode: 400, statusMessage: leadError.message })
  }

  if (!lead) {
    throw createError({ statusCode: 404, statusMessage: 'Lead not found' })
  }

  const { data: conversationByLead } = await client
    .from('whatsapp_conversation')
    .select('id, contact_phone, status')
    .eq('tenant_id', effectiveTenantId)
    .eq('lead_id', leadId)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle()

  if (conversationByLead?.id && isActiveWhatsAppConversationStatus(conversationByLead.status)) {
    return {
      data: {
        conversationId: conversationByLead.id,
        hasConversation: true,
        phone: conversationByLead.contact_phone,
      },
    }
  }

  const contacts = lead.crm_contact as Array<{ phone?: string | null }> | null
  const primaryContact = Array.isArray(contacts) ? contacts[0] : null
  const rawPhone = primaryContact?.phone?.trim() || null

  if (!isValidBrazilianMobilePhone(rawPhone)) {
    return {
      data: {
        conversationId: null,
        hasConversation: false,
        phone: rawPhone,
      },
    }
  }

  const normalizedPhone = formatBrazilianMobilePhone(rawPhone)!

  if (normalizedPhone) {
    const { data: conversationByPhone } = await client
      .from('whatsapp_conversation')
      .select('id, contact_phone, status')
      .eq('tenant_id', effectiveTenantId)
      .or(`contact_phone.eq.${normalizedPhone},contact_phone.ilike.%${normalizedPhone.slice(-11)}%`)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle()

    if (conversationByPhone?.id && isActiveWhatsAppConversationStatus(conversationByPhone.status)) {
      return {
        data: {
          conversationId: conversationByPhone.id,
          hasConversation: true,
          phone: conversationByPhone.contact_phone,
        },
      }
    }
  }

  return {
    data: {
      conversationId: null,
      hasConversation: false,
      phone: rawPhone,
    },
  }
})
