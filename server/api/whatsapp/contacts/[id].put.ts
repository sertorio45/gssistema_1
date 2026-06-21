import { createError, readBody } from 'h3'

import { serverSupabaseServiceRole } from '#supabase/server'

import { mapContactRow } from '~/composables/whatsapp/useWhatsAppMapper'
import { normalizePhone } from '~/server/utils/whatsapp/contact-utils'
import { resolveWhatsAppTenantContext } from '~/server/utils/whatsapp/context'
import type { UpdateWhatsAppContactPayload } from '~/types/whatsapp'

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

  const body = await readBody<UpdateWhatsAppContactPayload>(event)
  const { tenantId } = await resolveWhatsAppTenantContext(event, body.tenant_id)
  const client = serverSupabaseServiceRole(event)

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (body.name !== undefined)
    update.name = body.name?.trim() || null
  if (body.phone?.trim())
    update.phone = normalizePhone(body.phone.trim())
  if (body.tags)
    update.tags = body.tags
  if (body.opt_in !== undefined) {
    update.opt_in = body.opt_in
    update.opt_in_at = body.opt_in ? new Date().toISOString() : null
  }
  if (body.blocked !== undefined)
    update.blocked = body.blocked
  if (body.custom_fields)
    update.custom_fields = body.custom_fields

  const { data, error } = await client
    .from('whatsapp_contact')
    .update(update)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select(CONTACT_SELECT)
    .single()

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  return { data: mapContactRow(data as any) }
})
