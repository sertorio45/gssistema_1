import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { defineEventHandler, getRouterParam, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    return { status: 401, message: 'Unauthorized' }
  }

  const client = await serverSupabaseClient(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const { tenantId, role } = event.context.auth || {}

  const { data: article } = await client.from('articles').select('tenant_id').eq('id', id).single()
  if (!article || (role === 'cliente' && article.tenant_id !== tenantId)) {
    return { status: 403, message: 'Forbidden' }
  }

  const { data, error } = await client.from('articles').update(body).eq('id', id).select().single()
  if (error) {
    return { status: 400, message: error.message }
  }
  return data
}) 