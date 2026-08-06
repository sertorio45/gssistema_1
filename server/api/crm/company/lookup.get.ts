import type { CrmCompanyLookupResult } from '~/types/crm'
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { createError, getQuery } from 'h3'

import { isWrongTenantForScopedUser } from '~/server/utils/tenant-access'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Não autorizado' })
  }

  const { tenant_id, q, exclude_id, limit = '8' } = getQuery(event)

  if (!tenant_id) {
    throw createError({ statusCode: 400, statusMessage: 'Tenant ID é obrigatório' })
  }

  const query = String(q || '').trim()
  if (query.length < 2) {
    return { data: [] as CrmCompanyLookupResult[] }
  }

  const tenantRoles = user.app_metadata?.tenant_roles || {}
  let tenantId = event.context.auth?.tenantId as string | undefined
  if (!tenantId) {
    const firstTenant = Object.keys(tenantRoles)[0]
    if (firstTenant)
      tenantId = firstTenant
  }

  const role = tenantId && tenantRoles[tenantId]
    ? tenantRoles[tenantId]
    : user.user_metadata?.role || user.app_metadata?.role

  if (isWrongTenantForScopedUser(role, tenantId || null, String(tenant_id))) {
    throw createError({ statusCode: 403, statusMessage: 'Acesso negado' })
  }

  const maxResults = Math.min(Math.max(Number(limit) || 8, 1), 20)
  const excludeId = exclude_id ? String(exclude_id) : null
  const client = serverSupabaseServiceRole(event)

  let request = client
    .from('crm_company')
    .select('id, name, website, address, address_number, address_complement, cep, city, country, notes')
    .eq('tenant_id', tenant_id)
    .ilike('name', `%${query}%`)
    .order('updated_at', { ascending: false })
    .limit(maxResults)

  if (excludeId)
    request = request.neq('id', excludeId)

  const { data, error } = await request

  if (error) {
    throw createError({ statusCode: 400, statusMessage: error.message })
  }

  const results: CrmCompanyLookupResult[] = (data || []).map(row => ({
    id: String(row.id),
    name: String(row.name || ''),
    website: row.website ? String(row.website) : null,
    address: row.address ? String(row.address) : null,
    address_number: row.address_number ? String(row.address_number) : null,
    address_complement: row.address_complement ? String(row.address_complement) : null,
    cep: row.cep ? String(row.cep) : null,
    city: row.city ? String(row.city) : null,
    country: row.country ? String(row.country) : null,
    notes: row.notes ? String(row.notes) : null,
  }))

  return { data: results }
})
