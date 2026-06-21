import { createError, getQuery } from 'h3'

import { serverSupabaseServiceRole } from '#supabase/server'

import { mapContactRow } from '~/composables/whatsapp/useWhatsAppMapper'
import { resolveWhatsAppTenantContext } from '~/server/utils/whatsapp/context'
import type { WhatsAppContactDetail } from '~/types/whatsapp'

const CONTACT_SELECT = `
  *,
  crm_contact:crm_contact_id (
    name,
    email,
    company:crm_company (name)
  )
`

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, statusMessage: 'id is required' })

  const query = getQuery(event)
  const { tenantId } = await resolveWhatsAppTenantContext(event, query.tenant_id as string | undefined)
  const client = serverSupabaseServiceRole(event)

  const { data, error } = await client
    .from('whatsapp_contact')
    .select(CONTACT_SELECT)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  if (!data)
    throw createError({ statusCode: 404, statusMessage: 'Contact not found' })

  const { count } = await client
    .from('whatsapp_conversation')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('contact_id', id)

  const { data: lastConversation } = await client
    .from('whatsapp_conversation')
    .select('last_message_at')
    .eq('tenant_id', tenantId)
    .eq('contact_id', id)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle()

  const contact = mapContactRow(data as any) as WhatsAppContactDetail
  contact.conversationsCount = count || 0
  contact.lastConversationAt = lastConversation?.last_message_at || null

  return { data: contact }
})
