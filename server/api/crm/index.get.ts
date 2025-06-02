import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { defineEventHandler } from 'h3'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) return { status: 401, message: 'Unauthorized' }

  // Obtenha a role e o tenantId do usuário
  // Exemplo para estrutura multi-tenant comum:
  const tenantRoles = user.app_metadata?.tenant_roles || {}
  // Pegue o tenantId do contexto, header, ou do primeiro disponível
  let tenantId = event.context.auth?.tenantId
  if (!tenantId) {
    const firstTenant = Object.keys(tenantRoles)[0]
    if (firstTenant) tenantId = firstTenant
  }
  let role = null
  if (tenantId && tenantRoles[tenantId]) {
    role = tenantRoles[tenantId]
  } else {
    // fallback para role global, se existir
    role = user.user_metadata?.role || user.app_metadata?.role
  }

  const client = await serverSupabaseServiceRole(event)

  // Lógica de acesso:
  if (role === 'admin' || role === 'funcionario') {
    // Pode ver todos os artigos
    const { data, error } = await client.from('crm').select('*')
    if (error) return { status: 400, message: error.message }
    return data
  } else if (role === 'cliente' && tenantId) {
    // Só pode ver artigos do próprio tenant
    const { data, error } = await client.from('articles').select('*').eq('tenant_id', tenantId)
    if (error) return { status: 400, message: error.message }
    return data
  } else {
    // Não autenticado ou sem permissão
    return { status: 403, message: 'Forbidden' }
  }
})
