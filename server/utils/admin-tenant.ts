import { createError } from 'h3'

export function generateTenantSlug(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function createAdminTenant(
  client: { from: (table: string) => any },
  name: string,
) {
  const trimmed = name.trim()
  if (!trimmed)
    throw createError({ statusCode: 400, statusMessage: 'Nome da empresa é obrigatório' })

  const slug = generateTenantSlug(trimmed)
  if (!slug)
    throw createError({ statusCode: 400, statusMessage: 'Nome da empresa inválido' })

  const { data, error } = await client
    .from('tenant')
    .insert({
      name: trimmed,
      slug,
      is_active: true,
    })
    .select('id, name, slug')
    .single()

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  return data as { id: string, name: string, slug: string }
}

export async function seedTenantAllModules(
  client: { from: (table: string) => any },
  tenantId: string,
) {
  const { error } = await client
    .from('tenant_modules')
    .upsert(
      {
        tenant_id: tenantId,
        module_name: 'all',
        is_active: true,
        activated_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_id,module_name' },
    )

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })
}
