import { serverSupabaseServiceRole } from '#supabase/server'
import { createError, readBody } from 'h3'

import { createDefaultDrawflowCanvas } from '~/constants/whatsapp-flow-nodes'
import { mapFlowRow } from '~/composables/whatsapp/useWhatsAppMapper'
import type { CreateWhatsAppFlowPayload } from '~/types/whatsapp'
import { extractViewportFromCanvas } from '~/server/utils/whatsapp/flow-canvas'
import { resolveWhatsAppTenantContext } from '~/server/utils/whatsapp/context'

export default defineEventHandler(async (event) => {
  const body = await readBody<CreateWhatsAppFlowPayload>(event)
  const { tenantId } = await resolveWhatsAppTenantContext(event, body.tenant_id)

  if (!body.name?.trim())
    throw createError({ statusCode: 400, statusMessage: 'name is required' })

  const client = serverSupabaseServiceRole(event)
  const defaultCanvas = createDefaultDrawflowCanvas()

  const { data, error } = await client
    .from('whatsapp_flow')
    .insert({
      tenant_id: tenantId,
      name: body.name.trim(),
      description: body.description?.trim() || null,
      status: 'draft',
      trigger_type: body.trigger_type || 'message_received',
      trigger_config: body.trigger_config || {},
      viewport: extractViewportFromCanvas(defaultCanvas),
      version: 1,
    })
    .select('*')
    .single()

  if (error || !data)
    throw createError({ statusCode: 400, statusMessage: error?.message || 'Failed to create flow' })

  return { data: mapFlowRow(data as any) }
})
