import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { defineEventHandler } from 'h3'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) return { status: 401, message: 'Unauthorized' }

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
    role = user.user_metadata?.role || user.app_metadata?.role
  }

  const client = await serverSupabaseServiceRole(event)

  if (role === 'admin' || role === 'funcionario') {
    const { data, error } = await client.from('crm_company').select('*')
    if (error) return { status: 400, message: error.message }
    return data
  } else if (role === 'cliente' && tenantId) {
    const { data, error } = await client.from('crm_company').select('*').eq('tenant_id', tenantId)
    if (error) return { status: 400, message: error.message }
    return data
  } else {
    return { status: 403, message: 'Forbidden' }
  }
}) 