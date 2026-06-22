import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

import { defineEventHandler, getQuery } from 'h3'

import { ACTIVE_WHATSAPP_CONVERSATION_STATUSES } from '~/server/utils/whatsapp/conversation-utils'
import { attachActiveWhatsAppConversation } from '~/server/utils/whatsapp/lead-whatsapp'
import {
  canAccessTenantModule,
  isWrongTenantForScopedUser,
  resolveTenantApiAuth,
} from '~/server/utils/tenant-access'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user)
    return { status: 401, message: 'Unauthorized' }

  const { role, tenantId } = resolveTenantApiAuth(user, event.context.auth?.tenantId)
  const client = await serverSupabaseServiceRole(event)
  const { funnel_id, tenant_id: queryTenantId, start_date, end_date } = getQuery(event)

  const effectiveTenantId = (queryTenantId as string) || tenantId
  if (!effectiveTenantId)
    return { status: 400, message: 'Tenant ID is required' }

  if (!canAccessTenantModule(role))
    return { status: 403, message: 'Forbidden' }

  if (isWrongTenantForScopedUser(role, tenantId, effectiveTenantId))
    return { status: 403, message: 'Forbidden' }

  let query = client
    .from('crm_lead')
    .select('*, crm_contact(email, phone, name, position)')
    .eq('tenant_id', effectiveTenantId)
  if (funnel_id) {
    query = query.eq('funnel_id', funnel_id)
  }
  if (start_date) {
    query = query.gte('created_at', `${start_date}T00:00:00.000Z`)
  }
  if (end_date) {
    query = query.lte('created_at', `${end_date}T23:59:59.999Z`)
  }

  const { data, error } = await query
  if (error)
    return { status: 400, message: error.message }

  const leads = data || []
  const leadIds = leads.map(lead => lead.id as string)

  const conversationByLeadId = new Map<string, { id: string, status: string }>()

  if (leadIds.length > 0) {
    const { data: conversations } = await client
      .from('whatsapp_conversation')
      .select('id, lead_id, status, last_message_at')
      .eq('tenant_id', effectiveTenantId)
      .in('lead_id', leadIds)
      .in('status', ACTIVE_WHATSAPP_CONVERSATION_STATUSES)
      .order('last_message_at', { ascending: false, nullsFirst: false })

    for (const conversation of conversations || []) {
      if (!conversation.lead_id || conversationByLeadId.has(conversation.lead_id))
        continue

      conversationByLeadId.set(conversation.lead_id, {
        id: conversation.id as string,
        status: String(conversation.status),
      })
    }
  }

  return leads.map((lead: Record<string, unknown>) => {
    const contacts = lead.crm_contact as Array<{ email?: string, phone?: string, name?: string, position?: string }> | null
    const primaryContact = Array.isArray(contacts) ? contacts[0] : null
    const { crm_contact: _contacts, ...leadFields } = lead
    return attachActiveWhatsAppConversation({
      ...leadFields,
      email: primaryContact?.email ?? null,
      phone: primaryContact?.phone ?? null,
      contact_name: primaryContact?.name ?? null,
      contact_position: primaryContact?.position ?? null,
    }, conversationByLeadId)
  })
})
