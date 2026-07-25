import type { AppRoleSlug } from '~/constants/roles'
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

import { createError, getHeader, getQuery } from 'h3'

export type SocialCapability
  = | 'marketing.social.read'
    | 'marketing.social.create'
    | 'marketing.social.comment'
    | 'marketing.social.approve'
    | 'marketing.social.publish'
    | 'marketing.social.integrations'
    | 'marketing.social.manage'

interface SocialRequestContext {
  client: any
  user: NonNullable<Awaited<ReturnType<typeof serverSupabaseUser>>>
  tenantId: string
  role: AppRoleSlug
  capability: SocialCapability
  isPlatformStaff: boolean
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const ATTENDANT_CAPABILITIES = new Set<SocialCapability>([
  'marketing.social.read',
  'marketing.social.create',
  'marketing.social.comment',
])

function canRole(role: AppRoleSlug, capability: SocialCapability) {
  if (role === 'admin' || role === 'funcionario' || role === 'cliente')
    return true
  return ATTENDANT_CAPABILITIES.has(capability)
}

async function normalizeTenantId(
  client: any,
  value?: string | null,
) {
  if (!value)
    return null
  if (UUID_PATTERN.test(value))
    return value

  const { data } = await client
    .from('tenant')
    .select('id')
    .eq('slug', value)
    .maybeSingle()

  return data?.id ? String(data.id) : null
}

async function resolveMembershipRole(
  client: any,
  userId: string,
  tenantId: string,
): Promise<AppRoleSlug | null> {
  const { data: direct } = await client
    .from('user_tenant_role')
    .select('role')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (direct?.role)
    return direct.role as AppRoleSlug

  const { data: portfolioRows } = await client
    .from('organization_tenants')
    .select('organization_id')
    .eq('tenant_id', tenantId)

  const organizationIds = (portfolioRows || []).map((row: any) => String(row.organization_id))
  if (!organizationIds.length)
    return null

  const { data: organizationMembership } = await client
    .from('organization_memberships')
    .select('role')
    .eq('user_id', userId)
    .eq('is_active', true)
    .in('organization_id', organizationIds)
    .limit(1)
    .maybeSingle()

  return organizationMembership?.role
    ? organizationMembership.role as AppRoleSlug
    : null
}

async function resolveCapabilityOverride(
  client: any,
  userId: string,
  tenantId: string,
  capability: SocialCapability,
) {
  const { data } = await client
    .from('tenant_capability_grants')
    .select('allowed')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .eq('capability', capability)
    .maybeSingle()

  return typeof data?.allowed === 'boolean' ? data.allowed : null
}

export async function requireSocialContext(
  event: any,
  capability: SocialCapability,
  requestedTenantId?: string | null,
): Promise<SocialRequestContext> {
  const user = await serverSupabaseUser(event)
  if (!user)
    throw createError({ statusCode: 401, statusMessage: 'Não autenticado' })

  const client: any = await serverSupabaseServiceRole(event)
  const queryTenant = String(getQuery(event).tenant_id || '').trim() || null
  const headerTenant = getHeader(event, 'X-Tenant-Id')?.trim() || null
  const tenantRoles = (user.app_metadata as { tenant_roles?: Record<string, string> })?.tenant_roles || {}
  const fallbackTenant = Object.keys(tenantRoles)[0] || null
  const tenantId = await normalizeTenantId(
    client,
    requestedTenantId || headerTenant || queryTenant || fallbackTenant,
  )

  if (!tenantId)
    throw createError({ statusCode: 400, statusMessage: 'Selecione uma empresa' })

  // Only app_metadata can grant platform-wide access.
  const globalRole = (user.app_metadata as { role?: string })?.role
  const isPlatformStaff = globalRole === 'admin' || globalRole === 'funcionario'
  const role = isPlatformStaff
    ? globalRole
    : await resolveMembershipRole(client, user.id, tenantId)

  if (!role)
    throw createError({ statusCode: 403, statusMessage: 'Sem acesso a esta empresa' })

  const override = await resolveCapabilityOverride(client, user.id, tenantId, capability)
  const allowed = override ?? canRole(role, capability)
  if (!allowed)
    throw createError({ statusCode: 403, statusMessage: 'Sem permissão para esta ação' })

  const { data: moduleActive, error: moduleError } = await client.rpc('is_tenant_module_active', {
    p_tenant_id: tenantId,
    p_module_name: 'marketing',
  })

  if (!isPlatformStaff && (moduleError || !moduleActive))
    throw createError({ statusCode: 403, statusMessage: 'Módulo Marketing não contratado' })

  return {
    client,
    user,
    tenantId,
    role,
    capability,
    isPlatformStaff,
  }
}
