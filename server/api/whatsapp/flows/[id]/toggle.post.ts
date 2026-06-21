import { serverSupabaseServiceRole } from '#supabase/server'
import { createError, getQuery, getRouterParam } from 'h3'

import { mapFlowRow } from '~/composables/whatsapp/useWhatsAppMapper'
import { getCanvasFromViewport, validateFlowCanvasForActivation } from '~/server/utils/whatsapp/flow-canvas'
import { resolveWhatsAppTenantContext } from '~/server/utils/whatsapp/context'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, statusMessage: 'id is required' })

  const query = getQuery(event)
  const { tenantId } = await resolveWhatsAppTenantContext(event, query.tenant_id as string | undefined)
  const client = serverSupabaseServiceRole(event)

  const { data: existing } = await client
    .from('whatsapp_flow')
    .select('status, viewport')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!existing)
    throw createError({ statusCode: 404, statusMessage: 'Flow not found' })

  const nextStatus = existing.status === 'active' ? 'paused' : 'active'

  if (nextStatus === 'active') {
    const canvas = getCanvasFromViewport(existing.viewport as Record<string, unknown>)
    const validationError = validateFlowCanvasForActivation(canvas)
    if (validationError) {
      throw createError({ statusCode: 400, statusMessage: validationError })
    }
  }

  const { data, error } = await client
    .from('whatsapp_flow')
    .update({
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select('*')
    .single()

  if (error || !data)
    throw createError({ statusCode: 400, statusMessage: error?.message || 'Toggle failed' })

  return { data: mapFlowRow(data as any) }
})
