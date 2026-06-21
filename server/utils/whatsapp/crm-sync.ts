import { serverSupabaseServiceRole } from '#supabase/server'
import { createError } from 'h3'

import { mapContactRow } from '~/composables/whatsapp/useWhatsAppMapper'
import { normalizePhone } from '~/server/utils/whatsapp/contact-utils'
import { resolveWhatsAppTenantContext } from '~/server/utils/whatsapp/context'

interface SyncCrmOptions {
  createIfMissing?: boolean
  crmContactId?: string | null
}

export async function syncWhatsAppContactToCrm(
  client: ReturnType<typeof serverSupabaseServiceRole>,
  tenantId: string,
  whatsappContact: Record<string, any>,
  options: SyncCrmOptions = {},
) {
  const phone = normalizePhone(whatsappContact.phone || '')
  const name = whatsappContact.name || phone

  if (options.crmContactId) {
    const { data: crmContact, error } = await client
      .from('crm_contact')
      .update({
        name,
        phone: whatsappContact.phone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', options.crmContactId)
      .eq('tenant_id', tenantId)
      .select('id, name, email')
      .single()

    if (error)
      throw createError({ statusCode: 400, statusMessage: error.message })

    await client
      .from('whatsapp_contact')
      .update({ crm_contact_id: crmContact.id, updated_at: new Date().toISOString() })
      .eq('id', whatsappContact.id)

    return crmContact
  }

  if (whatsappContact.crm_contact_id) {
    const { data: crmContact, error } = await client
      .from('crm_contact')
      .update({
        name,
        phone: whatsappContact.phone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', whatsappContact.crm_contact_id)
      .eq('tenant_id', tenantId)
      .select('id, name, email')
      .single()

    if (!error && crmContact)
      return crmContact
  }

  const { data: byPhone } = await client
    .from('crm_contact')
    .select('id, name, email')
    .eq('tenant_id', tenantId)
    .or(`phone.ilike.%${phone.slice(-11)}%,phone.ilike.%${phone}%`)
    .limit(1)
    .maybeSingle()

  if (byPhone?.id) {
    await client
      .from('whatsapp_contact')
      .update({ crm_contact_id: byPhone.id, updated_at: new Date().toISOString() })
      .eq('id', whatsappContact.id)

    return byPhone
  }

  if (!options.createIfMissing) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Nenhum contato CRM encontrado para vincular',
    })
  }

  const placeholderEmail = `whatsapp+${phone || whatsappContact.id}@blimber.local`

  const { data: created, error: insertError } = await client
    .from('crm_contact')
    .insert({
      tenant_id: tenantId,
      name,
      email: placeholderEmail,
      phone: whatsappContact.phone,
      tags: whatsappContact.tags || [],
    })
    .select('id, name, email')
    .single()

  if (insertError || !created) {
    throw createError({
      statusCode: 400,
      statusMessage: insertError?.message || 'Failed to create CRM contact',
    })
  }

  await client
    .from('whatsapp_contact')
    .update({ crm_contact_id: created.id, updated_at: new Date().toISOString() })
    .eq('id', whatsappContact.id)

  return created
}
