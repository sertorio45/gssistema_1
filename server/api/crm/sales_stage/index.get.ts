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
  }
  else {
    role = user.user_metadata?.role || user.app_metadata?.role
  }

  const client = await serverSupabaseServiceRole(event)
  const { pipeline_id, active_only, tenant_id: queryTenantId } = getQuery(event)
  const effectiveTenantId = (queryTenantId as string) || tenantId

  if (!effectiveTenantId) {
    return { status: 400, message: 'Tenant ID is required' }
  }

  if (role === 'cliente' && effectiveTenantId !== tenantId) {
    return { status: 403, message: 'Forbidden' }
  }

  let activePipelineIds: string[] = []
  if (active_only === 'true') {
    const { data: activePipelines } = await client
      .from('crm_pipeline')
      .select('id')
      .eq('is_active', true)
      .or(`is_default.eq.true,tenant_id.eq.${effectiveTenantId}`)

    activePipelineIds = activePipelines?.map(p => p.id) || []
  }

  if (role === 'admin' || role === 'funcionario' || role === 'cliente') {
    let query = client.from('crm_sales_stage').select('*')
      .or(`is_default.eq.true,tenant_id.eq.${effectiveTenantId}`)

    if (pipeline_id) {
      query = query.eq('pipeline_id', String(pipeline_id))
    }

    if (active_only === 'true' && activePipelineIds.length > 0) {
      query = query.in('pipeline_id', activePipelineIds)
    }

    const { data, error } = await query
      .order('is_default', { ascending: false })
      .order('order')

    if (error) {
      return { status: 400, message: error.message }
    }

    return data
  }
  else {
    return { status: 403, message: 'Forbidden' }
  }
})
