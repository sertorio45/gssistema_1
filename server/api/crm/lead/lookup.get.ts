import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { isWrongTenantForScopedUser } from '~/server/utils/tenant-access'
import { createError, getQuery } from 'h3'

import type { CrmLeadLookupResult } from '~/types/crm'

function mapContactRow(
  contact: Record<string, unknown>,
  lead?: Record<string, unknown> | null,
): CrmLeadLookupResult {
  const company = contact.company as Record<string, unknown> | null
  const resolvedLead = lead || (contact.lead as Record<string, unknown> | null)

  return {
    id: String(resolvedLead?.id || contact.id),
    match_type: resolvedLead?.id ? 'lead' : 'contact',
    name: String(resolvedLead?.name || contact.name || ''),
    lead_id: resolvedLead?.id ? String(resolvedLead.id) : (contact.lead_id ? String(contact.lead_id) : null),
    contact_name: contact.name ? String(contact.name) : null,
    email: contact.email ? String(contact.email) : null,
    phone: contact.phone ? String(contact.phone) : null,
    position: contact.position ? String(contact.position) : null,
    contact_notes: contact.notes ? String(contact.notes) : null,
    source: resolvedLead?.source ? String(resolvedLead.source) : null,
    priority: resolvedLead?.priority ? String(resolvedLead.priority) : null,
    value: resolvedLead?.value != null ? Number(resolvedLead.value) : null,
    lead_notes: resolvedLead?.notes ? String(resolvedLead.notes) : null,
    company_name: company?.name ? String(company.name) : null,
    company_industry: company?.industry ? String(company.industry) : null,
    company_size: company?.size ? String(company.size) : null,
    company_website: company?.website ? String(company.website) : null,
    company_address: company?.address ? String(company.address) : null,
  }
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const { tenant_id, q, exclude_lead_id, limit = '8' } = getQuery(event)

  if (!tenant_id) {
    throw createError({ statusCode: 400, statusMessage: 'Tenant ID is required' })
  }

  const query = String(q || '').trim()
  if (query.length < 2) {
    return { data: [] as CrmLeadLookupResult[] }
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

  if (isWrongTenantForScopedUser(role, tenantId, String(tenant_id))) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const client = serverSupabaseServiceRole(event)
  const maxResults = Math.min(Number(limit) || 8, 12)
  const excludeLeadId = exclude_lead_id ? String(exclude_lead_id) : null
  const searchPattern = `%${query}%`

  const [leadsResult, contactsResult] = await Promise.all([
    client
      .from('crm_lead')
      .select(`
        id, name, source, priority, value, notes,
        crm_contact(id, name, email, phone, position, notes, company:crm_company(name, industry, size, website, address))
      `)
      .eq('tenant_id', tenant_id)
      .ilike('name', searchPattern)
      .order('updated_at', { ascending: false })
      .limit(maxResults),
    client
      .from('crm_contact')
      .select(`
        id, name, email, phone, position, notes, lead_id,
        company:crm_company(name, industry, size, website, address),
        lead:crm_lead(id, name, source, priority, value, notes)
      `)
      .eq('tenant_id', tenant_id)
      .ilike('name', searchPattern)
      .order('updated_at', { ascending: false })
      .limit(maxResults),
  ])

  if (leadsResult.error) {
    throw createError({ statusCode: 400, statusMessage: leadsResult.error.message })
  }

  if (contactsResult.error) {
    throw createError({ statusCode: 400, statusMessage: contactsResult.error.message })
  }

  const results: CrmLeadLookupResult[] = []
  const seen = new Set<string>()

  for (const lead of leadsResult.data || []) {
    if (excludeLeadId && String(lead.id) === excludeLeadId)
      continue

    const contacts = lead.crm_contact as Array<Record<string, unknown>> | null
    const primaryContact = Array.isArray(contacts) ? contacts[0] : null
    const mapped = mapContactRow(primaryContact || { name: lead.name }, lead)

    const dedupeKey = `${mapped.match_type}:${mapped.lead_id || mapped.id}:${mapped.email || ''}:${mapped.phone || ''}`
    if (seen.has(dedupeKey))
      continue

    seen.add(dedupeKey)
    results.push(mapped)
  }

  for (const contact of contactsResult.data || []) {
    const linkedLead = contact.lead as Record<string, unknown> | null
    if (excludeLeadId && linkedLead?.id && String(linkedLead.id) === excludeLeadId)
      continue

    const mapped = mapContactRow(contact, linkedLead)
    const dedupeKey = `${mapped.match_type}:${mapped.lead_id || mapped.id}:${mapped.email || ''}:${mapped.phone || ''}`
    if (seen.has(dedupeKey))
      continue

    seen.add(dedupeKey)
    results.push(mapped)
  }

  const normalizedQuery = query.toLowerCase()

  results.sort((a, b) => {
    const aExact = a.name.toLowerCase() === normalizedQuery ? 0 : 1
    const bExact = b.name.toLowerCase() === normalizedQuery ? 0 : 1
    if (aExact !== bExact)
      return aExact - bExact

    const aStarts = a.name.toLowerCase().startsWith(normalizedQuery) ? 0 : 1
    const bStarts = b.name.toLowerCase().startsWith(normalizedQuery) ? 0 : 1
    if (aStarts !== bStarts)
      return aStarts - bStarts

    return a.name.localeCompare(b.name, 'pt-BR')
  })

  return { data: results.slice(0, maxResults) }
})
