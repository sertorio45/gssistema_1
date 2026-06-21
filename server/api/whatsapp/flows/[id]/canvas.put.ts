import { serverSupabaseServiceRole } from '#supabase/server'
import { createError, getRouterParam, readBody } from 'h3'

import type { DrawflowExport } from '~/types/drawflow'
import { mapFlowRow } from '~/composables/whatsapp/useWhatsAppMapper'
import { extractViewportFromCanvas } from '~/server/utils/whatsapp/flow-canvas'
import { resolveWhatsAppTenantContext } from '~/server/utils/whatsapp/context'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, statusMessage: 'id is required' })

  const body = await readBody<{ tenant_id?: string, canvas?: DrawflowExport, zoom?: number }>(event)
  const { tenantId } = await resolveWhatsAppTenantContext(event, body.tenant_id)

  if (!body.canvas?.drawflow?.Home?.data) {
    throw createError({ statusCode: 400, statusMessage: 'canvas is required' })
  }

  const client = serverSupabaseServiceRole(event)

  const { data: existing } = await client
    .from('whatsapp_flow')
    .select('version')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!existing)
    throw createError({ statusCode: 404, statusMessage: 'Flow not found' })

  const { data, error } = await client
    .from('whatsapp_flow')
    .update({
      viewport: extractViewportFromCanvas(body.canvas, body.zoom || 1),
      version: (existing.version || 1) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select('*')
    .single()

  if (error || !data)
    throw createError({ statusCode: 400, statusMessage: error?.message || 'Failed to save canvas' })

  return { data: mapFlowRow(data as any) }
})
