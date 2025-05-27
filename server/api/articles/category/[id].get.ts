import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { defineEventHandler, getRouterParam } from 'h3'

export default defineEventHandler(async (event) => {
  // Autenticação do usuário
  const user = await serverSupabaseUser(event)
  if (!user) {
    return { status: 401, message: 'Unauthorized' }
  }

  // Cliente Supabase
  const client = await serverSupabaseServiceRole(event)
  const id = getRouterParam(event, 'id')
  const { tenantId, role } = event.context.auth || {}

  // Buscar artigo completo
  const { data: article, error } = await client
    .from('articles_category')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (error || !article) {
    return { status: 404, message: 'Article not found' }
  }


  return { status: 200, data: article }
})
