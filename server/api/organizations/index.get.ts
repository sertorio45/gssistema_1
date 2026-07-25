import { getQuery } from 'h3'

import { requireOrganizationContext } from '~/server/utils/organization-access'

export default defineEventHandler(async (event) => {
  const { user, client, isPlatformStaff } = await requireOrganizationContext(event)
  const query = getQuery(event)

  let request = client
    .from('organizations')
    .select(`
      *,
      organization_tenants (tenant_id, is_primary, tenant:tenant_id (id, name, slug, is_active)),
      organization_memberships (id, user_id, role, is_active)
    `)
    .order('name')

  if (query.type && ['agency', 'direct', 'platform'].includes(String(query.type)))
    request = request.eq('type', String(query.type))

  if (!isPlatformStaff) {
    const { data: memberships } = await client
      .from('organization_memberships')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
    const ids = (memberships || []).map((row: any) => row.organization_id)
    if (!ids.length)
      return { data: [] }
    request = request.in('id', ids)
  }

  const { data, error } = await request
  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  return { data: data || [] }
})
