import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { defineEventHandler } from 'h3'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    return { status: 401, message: 'Unauthorized' }
  }

  const client = await serverSupabaseClient(event)
  const { tenantId, role } = event.context.auth || {}

  let query = client.from('articles').select('*')

  if (role === 'cliente') {
    // Cliente: sempre filtra pelo tenantId do JWT
    if (!tenantId) {
      return []
    }
    query = query.eq('tenant_id', tenantId)
  }
  else if (
    role === 'admin'
    || role === 'funcionario'
    || role === 'funcionário'
  ) {
    // Admin/funcionário: só mostra se houver tenant selecionado
    if (!tenantId) {
      return []
    }
    query = query.eq('tenant_id', tenantId)
  }

  const { data, error } = await query
  if (error) {
    return { status: 400, message: error.message }
  }
  return data
}) 