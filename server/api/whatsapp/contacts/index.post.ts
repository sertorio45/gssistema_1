import { serverSupabaseServiceRole } from '#supabase/server'
import { createError, readBody } from 'h3'

import { mapContactRow } from '~/composables/whatsapp/useWhatsAppMapper'
import { normalizePhone } from '~/server/utils/whatsapp/contact-utils'
import { resolveWhatsAppTenantContext } from '~/server/utils/whatsapp/context'
import type { CreateWhatsAppContactPayload } from '~/types/whatsapp'

const CONTACT_SELECT = `
  *,
  crm_contact:crm_contact_id (
    name,
    email,
    company:crm_company (name)
  )
`

export default defineEventHandler(async (event) => {
  const body = await readBody<CreateWhatsAppContactPayload>(event)
  const { tenantId } = await resolveWhatsAppTenantContext(event, body.tenant_id)

  const phone = body.phone?.trim()
  if (!phone)
    throw createError({ statusCode: 400, statusMessage: 'phone is required' })

  const normalized = normalizePhone(phone)
  const client = serverSupabaseServiceRole(event)

  const { data: existing } = await client
    .from('whatsapp_contact')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('phone', normalized)
    .maybeSingle()

  if (existing?.id) {
    throw createError({ statusCode: 409, statusMessage: 'Contact with this phone already exists' })
  }

  const { data, error } = await client
    .from('whatsapp_contact')
    .insert({
      tenant_id: tenantId,
      phone: normalized,
      name: body.name?.trim() || null,
      tags: body.tags || [],
      opt_in: body.opt_in ?? true,
      opt_in_at: body.opt_in === false ? null : new Date().toISOString(),
      blocked: body.blocked ?? false,
      custom_fields: body.custom_fields || {},
    })
    .select(CONTACT_SELECT)
    .single()

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  return { data: mapContactRow(data as any) }
})
