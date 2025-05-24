import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { defineEventHandler, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    return { status: 401, message: 'Unauthorized' }
  }

  const client = await serverSupabaseClient(event)
  const body = await readBody(event)
  const { tenantId, role } = event.context.auth || {}

  if (!tenantId || (role === 'cliente' && body.tenant_id !== tenantId)) {
    return { status: 403, message: 'Forbidden' }
  }

  body.tenant_id = tenantId

  const { data, error } = await client.from('articles').insert([body]).select().single()
  if (error) {
    return { status: 400, message: error.message }
  }
  return data
}) 