import { createError, getQuery } from 'h3'

import { resolveWhatsAppTenantContext } from '~/server/utils/whatsapp/context'
import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, statusMessage: 'id is required' })

  const query = getQuery(event)
  const { tenantId } = await resolveWhatsAppTenantContext(event, query.tenant_id as string | undefined)
  const client = serverSupabaseServiceRole(event)

  const { data: conversation, error: convError } = await client
    .from('whatsapp_conversation')
    .select('lead_id')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (convError || !conversation)
    throw createError({ statusCode: 404, statusMessage: 'Conversation not found' })

  if (!conversation.lead_id)
    return { data: null }

  const { data: lead, error: leadError } = await client
    .from('crm_lead')
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
    .eq('id', conversation.lead_id)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (leadError)
    throw createError({ statusCode: 400, statusMessage: leadError.message })

  if (!lead)
    return { data: null }

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
