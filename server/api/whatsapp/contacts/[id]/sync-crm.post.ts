import { createError, readBody } from 'h3'

import { serverSupabaseServiceRole } from '#supabase/server'

import { mapContactRow } from '~/composables/whatsapp/useWhatsAppMapper'
import { syncWhatsAppContactToCrmWithLead } from '~/server/utils/whatsapp/crm-sync'
import { resolveWhatsAppTenantContext } from '~/server/utils/whatsapp/context'

const CONTACT_SELECT = `
  *,
  crm_contact:crm_contact_id (
    name,
    email,
    company:crm_company (name)
  )
`

interface SyncCrmBody {
  tenant_id?: string
  create_if_missing?: boolean
  crm_contact_id?: string | null
  create_lead?: boolean
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, statusMessage: 'id is required' })

  const body = await readBody<SyncCrmBody>(event)
  const { tenantId } = await resolveWhatsAppTenantContext(event, body.tenant_id)
  const client = serverSupabaseServiceRole(event)

  const { data: contact, error } = await client
    .from('whatsapp_contact')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (error || !contact)
    throw createError({ statusCode: 404, statusMessage: 'Contact not found' })

  const result = await syncWhatsAppContactToCrmWithLead(client, tenantId, contact, {
    createIfMissing: body.create_if_missing ?? true,
    crmContactId: body.crm_contact_id,
    createLead: body.create_lead ?? true,
  })

  const { data: updated } = await client
    .from('whatsapp_contact')
    .select(CONTACT_SELECT)
    .eq('id', id)
    .single()

  return {
    data: mapContactRow(updated as any),
    crmContact: result.crmContact,
    lead: result.lead,
    leadCreated: result.leadCreated,
  }
})
