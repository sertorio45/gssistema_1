import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

import { defineEventHandler, readBody } from 'h3'

import {
  enqueueMetaConversion,
  scheduleMetaCapiProcessing,
} from '~/server/utils/crm/meta-capi'

function isWonStageName(name?: string | null) {
  const n = String(name || '').toLowerCase()
  return n.includes('ganh') || n.includes('won')
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user)
    return { status: 401, message: 'Unauthorized' }

  const id = event.context.params?.id
  const body = await readBody(event)
  const { sales_stage_id, status, closed_at } = body as {
    sales_stage_id?: string
    status?: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost'
    closed_at?: string | null
  }

  if (!id || !sales_stage_id)
    return { status: 400, message: 'Missing data' }

  const client = await serverSupabaseServiceRole(event)

  const { data: existingLead } = await client
    .from('crm_lead')
    .select('id, tenant_id, status')
    .eq('id', id)
    .maybeSingle()

  if (!existingLead)
    return { status: 404, message: 'Lead not found' }

  const { data: stage } = await client
    .from('crm_sales_stage')
    .select('id, name')
    .eq('id', sales_stage_id)
    .maybeSingle()

  const updatePayload: Record<string, unknown> = { sales_stage_id }
  if (status !== undefined)
    updatePayload.status = status
  if (closed_at !== undefined)
    updatePayload.closed_at = closed_at

  const { error } = await client.from('crm_lead').update(updatePayload).eq('id', id)

  if (error)
    return { status: 400, message: error.message }

  const isWon = status === 'won' || isWonStageName(stage?.name)
  const wasWon = existingLead.status === 'won'
  if (isWon && !wasWon) {
    await enqueueMetaConversion(client, {
      tenantId: existingLead.tenant_id as string,
      leadId: id,
      eventName: 'Purchase',
      eventTime: closed_at || new Date().toISOString(),
    }).catch(() => {})
    scheduleMetaCapiProcessing(event, client, existingLead.tenant_id as string)
  }

  return { success: true }
})
