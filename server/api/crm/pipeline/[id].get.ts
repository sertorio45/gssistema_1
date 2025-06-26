import { serverSupabaseServiceRole } from '#supabase/server'
import { defineEventHandler, getRouterParam } from 'h3'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    return { status: 400, message: 'Missing pipeline id' }
  }

  const client = await serverSupabaseServiceRole(event)
  const { data, error } = await client
    .from('crm_pipeline')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return { status: 404, message: 'Pipeline not found' }
  }

  return data
}) 