import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

import { defineEventHandler, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user)
    return { status: 401, message: 'Unauthorized' }

  const id = event.context.params?.id
  const body = await readBody(event)
  const { sales_stage_id, status, closed_at } = body as {
    sales_stage_id?: string
    status?: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost'
    closed_at?: string
  }

  if (!id || !sales_stage_id)
    return { status: 400, message: 'Missing data' }

  const client = await serverSupabaseServiceRole(event)
  const updatePayload: Record<string, unknown> = { sales_stage_id }
  if (status !== undefined)
    updatePayload.status = status
  if (closed_at !== undefined)
    updatePayload.closed_at = closed_at

  const { error } = await client.from('crm_lead').update(updatePayload).eq('id', id)

  if (error)
    return { status: 400, message: error.message }
  return { success: true }
})
