import type { SupabaseClient } from '@supabase/supabase-js'
import { createError } from 'h3'

export function normalizeCompanyName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

/**
 * Blocks duplicate company names within the same tenant (case-insensitive).
 * Relies on the unique index as a backstop; this check returns a friendly 409.
 */
export async function assertUniqueCompanyName(
  client: SupabaseClient,
  options: { tenantId: string, name: string, excludeId?: string | null },
) {
  const name = normalizeCompanyName(options.name)
  if (!name)
    throw createError({ statusCode: 400, statusMessage: 'Nome da empresa é obrigatório' })

  // Escape ILIKE wildcards so names with %/_ stay exact matches.
  const escaped = name.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')

  let query = client
    .from('crm_company')
    .select('id')
    .eq('tenant_id', options.tenantId)
    .ilike('name', escaped)
    .limit(1)

  if (options.excludeId)
    query = query.neq('id', options.excludeId)

  const { data, error } = await query
  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  // Exact case-insensitive match (ilike without wildcards is exact ignoring case).
  if (data?.length) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Já existe uma empresa com este nome neste ambiente',
    })
  }

  return name
}

export function companyAddressPayload(body: Record<string, any>) {
  return {
    address: body.address?.trim() || null,
    address_number: body.address_number?.trim() || body.addressNumber?.trim() || null,
    address_complement: body.address_complement?.trim() || body.addressComplement?.trim() || null,
    cep: body.cep?.trim() || null,
    city: body.city?.trim() || null,
    country: body.country?.trim() || null,
  }
}
