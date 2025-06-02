import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { defineEventHandler, getQuery } from 'h3'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    return { status: 401, message: 'Unauthorized' }
  }

  const tenantRoles = user.app_metadata?.tenant_roles || {}
  let tenantId = event.context.auth?.tenantId
  if (!tenantId) {
    const firstTenant = Object.keys(tenantRoles)[0]
    if (firstTenant) {
      tenantId = firstTenant
    }
  }

  let role = null
  if (tenantId && tenantRoles[tenantId]) {
    role = tenantRoles[tenantId]
  } else {
    role = user.user_metadata?.role || user.app_metadata?.role
  }

  const client = await serverSupabaseServiceRole(event)
  const { pipeline_id } = getQuery(event)

  if (role === 'admin' || role === 'funcionario') {
    let query = client.from('crm_lead').select('*')
    if (pipeline_id) {
      query = query.eq('pipeline_id', pipeline_id)
    }

    const { data, error } = await query
    if (error) {
      return { status: 400, message: error.message }
    }

    return data
  } else if (role === 'cliente' && tenantId) {
    let query = client.from('crm_lead').select('*').eq('tenant_id', tenantId)
    if (pipeline_id) {
      query = query.eq('pipeline_id', pipeline_id)
    }

    const { data, error } = await query
    if (error) {
      return { status: 400, message: error.message }
    }

    return data
  } else {
    return { status: 403, message: 'Forbidden' }
  }
}) 