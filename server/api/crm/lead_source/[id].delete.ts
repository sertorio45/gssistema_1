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

  const { data: leadSource } = await client.from('crm_lead_source_table').select('tenant_id').eq('id', id).single()
  if (!leadSource || (role === 'cliente' && leadSource.tenant_id !== tenantId)) {
    return { status: 403, message: 'Forbidden' }
  }

  const { error } = await client.from('crm_lead_source_table').delete().eq('id', id)
  if (error) {
    return { status: 400, message: error.message }
  }
  return { success: true }
})
