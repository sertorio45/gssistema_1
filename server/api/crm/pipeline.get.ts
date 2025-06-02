import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { defineEventHandler, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) return { status: 401, message: 'Unauthorized' }

  let tenantId = event.context.auth?.tenantId
  if (!tenantId) {
    // Buscar manualmente na query string
    const url = event.node.req.url || ''
    const match = url.match(/[?&]tenant_id=([\w-]+)/)
    if (match) tenantId = match[1]
  }

  if (!tenantId) {
    const body = await readBody(event)
    tenantId = body?.tenant_id
  }

  if (!tenantId) return { status: 400, message: 'tenant_id obrigatório' }

  const client = await serverSupabaseServiceRole(event)
  const { data, error } = await client.from('crm_pipeline').select('*').eq('tenant_id', tenantId)
  if (error) return { status: 400, message: error.message }

  return data
}) 