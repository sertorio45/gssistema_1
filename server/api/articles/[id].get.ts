import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { defineEventHandler, getRouterParam } from 'h3'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    return { status: 401, message: 'Unauthorized' }
  }

  const client = await serverSupabaseClient(event)
  const id = getRouterParam(event, 'id')
  const { tenantId, role } = event.context.auth || {}

  let query = client.from('articles').select('*').eq('id', id)
  if (role === 'cliente') {
    query = query.eq('tenant_id', tenantId)
  }

  const { data, error } = await query.single()
  if (error) {
    return { status: 404, message: error.message }
  }
  return data
}) 