import { createError, readBody } from 'h3'

import { resolveWhatsAppTenantContext } from '~/server/utils/whatsapp/context'
import { serverSupabaseServiceRole } from '#supabase/server'

interface UpdateLeadBody {
  tenant_id?: string
  value?: number
  service_name?: string | null
  product_id?: string | null
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, statusMessage: 'id is required' })

  const body = await readBody<UpdateLeadBody>(event)
  const { tenantId } = await resolveWhatsAppTenantContext(event, body.tenant_id)
  const client = serverSupabaseServiceRole(event)

  const { data: conversation, error: convError } = await client
    .from('whatsapp_conversation')
    .select('lead_id')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (convError || !conversation)
    throw createError({ statusCode: 404, statusMessage: 'Conversation not found' })

  if (!conversation.lead_id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Esta conversa não possui lead vinculado',
    })
  }

  let serviceName = body.service_name ?? undefined
  let leadValue = body.value

  if (body.product_id) {
    const { data: product, error: productError } = await client
      .from('crm_products')
      .select('id, name, price')
      .eq('id', body.product_id)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (productError || !product)
      throw createError({ statusCode: 404, statusMessage: 'Produto/serviço não encontrado' })

    serviceName = String(product.name || serviceName || '')
    if (leadValue === undefined)
      leadValue = Number(product.price || 0)
  }

  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (serviceName !== undefined)
    update.company = serviceName || null
  if (leadValue !== undefined)
    update.value = leadValue

  const { data: lead, error: updateError } = await client
    .from('crm_lead')
    .update(update)
    .eq('id', conversation.lead_id)
    .eq('tenant_id', tenantId)
    .select(`
      id,
      name,
      value,
      company,
      status,
      priority,
      crm_sales_stage (name),
      crm_funnel (name)
    `)
    .single()

  if (updateError || !lead)
    throw createError({ statusCode: 400, statusMessage: updateError?.message || 'Failed to update lead' })

  const stage = lead.crm_sales_stage as { name?: string } | null
  const funnel = lead.crm_funnel as { name?: string } | null

  return {
    data: {
      id: lead.id as string,
      name: String(lead.name || ''),
      value: Number(lead.value || 0),
      serviceName: lead.company ? String(lead.company) : null,
      stageName: stage?.name ? String(stage.name) : null,
      funnelName: funnel?.name ? String(funnel.name) : null,
      status: String(lead.status || 'new'),
      priority: String(lead.priority || 'medium'),
    },
  }
})
