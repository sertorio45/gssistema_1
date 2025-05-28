import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { useTenantStore } from '~/stores/tenant'
import { defineEventHandler } from 'h3'

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
  const articleId = event.context?.params?.id
  if (!articleId) return { status: 400, message: 'Article ID not provided' }

  if (role === 'admin' || role === 'funcionario') {
    const { data, error } = await client.from('articles_tag_relations').select('*').eq('id', articleId)
    if (error) return { status: 400, message: error.message }

    return data
  }
  else if (role === 'cliente' && tenantId) {
    const { data, error } = await client.from('articles_tag_relations').select('*').eq('id', articleId).eq('tenant_id', tenantId)
    if (error) return { status: 400, message: error.message }

    return data
  }
  else {
    return { status: 403, message: 'Forbidden' }
  }
})
