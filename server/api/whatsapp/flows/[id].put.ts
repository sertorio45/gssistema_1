import { serverSupabaseServiceRole } from '#supabase/server'
import { createError, getRouterParam, readBody } from 'h3'

import { mapFlowRow } from '~/composables/whatsapp/useWhatsAppMapper'
import type { UpdateWhatsAppFlowPayload } from '~/types/whatsapp'
import { resolveWhatsAppTenantContext } from '~/server/utils/whatsapp/context'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, statusMessage: 'id is required' })

  const body = await readBody<UpdateWhatsAppFlowPayload>(event)
  const { tenantId } = await resolveWhatsAppTenantContext(event, body.tenant_id)
  const client = serverSupabaseServiceRole(event)

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (body.name?.trim())
    updatePayload.name = body.name.trim()
  if (body.description !== undefined)
    updatePayload.description = body.description?.trim() || null
  if (body.status)
    updatePayload.status = body.status
  if (body.trigger_type)
    updatePayload.trigger_type = body.trigger_type
  if (body.trigger_config)
    updatePayload.trigger_config = body.trigger_config

  const { data, error } = await client
    .from('whatsapp_flow')
    .update(updatePayload)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select('*')
    .single()

  if (error || !data)
    throw createError({ statusCode: 400, statusMessage: error?.message || 'Update failed' })

  return { data: mapFlowRow(data as any) }
})
