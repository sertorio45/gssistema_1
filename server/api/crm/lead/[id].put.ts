import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { defineEventHandler, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) return { status: 401, message: 'Unauthorized' }

  const id = event.context.params?.id
  const body = await readBody(event)
  const { sales_stage_id } = body

  if (!id || !sales_stage_id) return { status: 400, message: 'Missing data' }

  const client = await serverSupabaseServiceRole(event)
  const { error } = await client
    .from('crm_lead')
    .update({ sales_stage_id })
    .eq('id', id)

  if (error) return { status: 400, message: error.message }
  return { success: true }
}) 