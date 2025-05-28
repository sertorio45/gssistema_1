import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { defineEventHandler, getQuery } from 'h3'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) return { status: 401, message: 'Unauthorized' }

  // Obtenha a role e o tenantId do usuário
  const tenantRoles = user.app_metadata?.tenant_roles || {}
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
  const query = getQuery(event)
  const { article_id } = query

  if (role === 'admin' || role === 'funcionario') {
    let supabaseQuery = client.from('articles_tag_relations').select('*')
    if (article_id) {
      supabaseQuery = supabaseQuery.eq('article_id', article_id)
    }
    const { data, error } = await supabaseQuery
    if (error) return { status: 400, message: error.message }

    return data
  }
  else if (role === 'cliente' && tenantId) {
    let supabaseQuery = client.from('articles_tag_relations').select('*').eq('tenant_id', tenantId)
    if (article_id) {
      supabaseQuery = supabaseQuery.eq('article_id', article_id)
    }
    const { data, error } = await supabaseQuery
    if (error) return { status: 400, message: error.message }

    return data
  }
  else {
    return { status: 403, message: 'Forbidden' }
  }
})
