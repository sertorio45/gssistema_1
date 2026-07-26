import type { WorkspaceContext } from '~/server/utils/workspace-context'

import { createError } from 'h3'

import { listAccessibleTenants } from '~/server/utils/workspace-context'

export type { AgencyOnboardingStep } from '~/constants/workspace'
export { AGENCY_ONBOARDING_STEPS } from '~/constants/workspace'

export interface AgencyBrandingSettings {
  commercial_name: string | null
  logo_url: string | null
  primary_color: string | null
  /** Reserved for a future custom-domain feature. Must not drive routing yet. */
  custom_domain: string | null
  invite_display_name: string | null
  notification_signature: string | null
}

export const EMPTY_AGENCY_BRANDING: AgencyBrandingSettings = {
  commercial_name: null,
  logo_url: null,
  primary_color: null,
  custom_domain: null,
  invite_display_name: null,
  notification_signature: null,
}

export function extractAgencyBranding(settings: Record<string, unknown> | null | undefined): AgencyBrandingSettings {
  const branding = (settings?.branding && typeof settings.branding === 'object')
    ? settings.branding as Record<string, unknown>
    : {}

  return {
    commercial_name: typeof branding.commercial_name === 'string' ? branding.commercial_name : null,
    logo_url: typeof branding.logo_url === 'string' ? branding.logo_url : null,
    primary_color: typeof branding.primary_color === 'string' ? branding.primary_color : null,
    custom_domain: typeof branding.custom_domain === 'string' ? branding.custom_domain : null,
    invite_display_name: typeof branding.invite_display_name === 'string' ? branding.invite_display_name : null,
    notification_signature: typeof branding.notification_signature === 'string'
      ? branding.notification_signature
      : null,
  }
}

export function mergeAgencyBranding(
  settings: Record<string, unknown> | null | undefined,
  branding: Partial<AgencyBrandingSettings>,
): Record<string, unknown> {
  const current = { ...(settings || {}) }
  const nextBranding = {
    ...extractAgencyBranding(current),
    ...branding,
  }
  return {
    ...current,
    branding: nextBranding,
  }
}

/** Ensures the resolved organization is an active agency before ops endpoints continue. */
export function assertAgencyOrganization(context: WorkspaceContext) {
  if (!context.organization || context.organization.type !== 'agency') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Área disponível apenas para organizações do tipo agência',
    })
  }
  if (!context.organization.isActive) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Organização inativa',
    })
  }
  return context.organization
}

/**
 * Managed client tenants the caller may see inside this agency — never grants
 * reach the resolver already denied.
 */
export async function listAccessibleManagedClientIds(
  context: WorkspaceContext,
  organizationId: string,
): Promise<string[]> {
  const tenants = await listAccessibleTenants(context.client, {
    userId: context.userId,
    isPlatformStaff: context.isPlatformStaff,
    organizationId,
  })

  return tenants
    .filter(tenant => tenant.relationshipType === 'managed' && tenant.isActive)
    .map(tenant => tenant.id)
}

export async function countByTenantIds(
  client: any,
  table: string,
  tenantIds: string[],
  build?: (query: any) => any,
): Promise<number> {
  if (!tenantIds.length)
    return 0

  let query = client
    .from(table)
    .select('id', { count: 'exact', head: true })
    .in('tenant_id', tenantIds)

  if (build)
    query = build(query)

  const { count, error } = await query
  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  return count || 0
}
