import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user)
    throw createError({ statusCode: 401, statusMessage: 'Não autenticado' })
  const client: any = await serverSupabaseServiceRole(event)
  const globalRole = (user.app_metadata as { role?: string })?.role

  if (globalRole === 'admin' || globalRole === 'funcionario') {
    const { data, error } = await client
      .from('tenant')
      .select('id, name, slug, is_active, created_at, updated_at')
      .order('name')
    if (error)
      throw createError({ statusCode: 400, statusMessage: error.message })
    return { tenants: data || [], portfolio: true }
  }

  const { data: directRows } = await client
    .from('user_tenant_role')
    .select('tenant_id')
    .eq('user_id', user.id)

  const { data: memberships } = await client
    .from('organization_memberships')
    .select('organization_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
  const organizationIds = (memberships || []).map((row: any) => row.organization_id)
  const { data: portfolioRows } = organizationIds.length
    ? await client
      .from('organization_tenants')
      .select('tenant_id')
      .in('organization_id', organizationIds)
    : { data: [] }

  const tenantIds = [...new Set([
    ...(directRows || []).map((row: any) => row.tenant_id),
    ...(portfolioRows || []).map((row: any) => row.tenant_id),
  ].filter(Boolean))]
  if (!tenantIds.length)
    return { tenants: [], portfolio: false }

  const { data, error } = await client
    .from('tenant')
    .select('id, name, slug, is_active, created_at, updated_at')
    .in('id', tenantIds)
    .order('name')
  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  return {
    tenants: data || [],
    portfolio: Boolean(portfolioRows?.length),
  }
})
