/**
 * Workspace scopes shared by the Nitro resolver and the UI.
 *
 * Three commercial models live side by side:
 * - `platform`: administra o SaaS inteiro;
 * - `agency`: atende uma carteira de clientes;
 * - `direct`: empresa que contratou o sistema para si mesma.
 *
 * Cargos profissionais (Designer, Social Media, Aprovador...) são expressos por
 * capabilities, nunca pelo enum global `app_role`.
 */

export type OrganizationType = 'platform' | 'agency' | 'direct'

export type OrganizationRelationshipType = 'owner' | 'managed'

export const ORGANIZATION_TYPES: OrganizationType[] = ['platform', 'agency', 'direct']

export const ORGANIZATION_TYPE_LABELS: Record<OrganizationType, string> = {
  platform: 'Plataforma',
  agency: 'Agência',
  direct: 'Cliente direto',
}

export const ORGANIZATION_RELATIONSHIP_LABELS: Record<OrganizationRelationshipType, string> = {
  owner: 'Empresa principal',
  managed: 'Cliente atendido',
}

export const PLATFORM_CAPABILITIES = [
  'platform.organizations.read',
  'platform.organizations.manage',
  'platform.tenants.read',
  'platform.context.switch',
  'platform.audit.read',
] as const

export const ORGANIZATION_CAPABILITIES = [
  'organization.read',
  'organization.manage',
  'organization.members.manage',
  'organization.tenants.read',
  'organization.approvals.read',
] as const

export const MARKETING_SOCIAL_CAPABILITIES = [
  'marketing.social.read',
  'marketing.social.create',
  'marketing.social.comment',
  'marketing.social.approve',
  'marketing.social.publish',
  'marketing.social.integrations',
  'marketing.social.manage',
] as const

export type PlatformCapability = typeof PLATFORM_CAPABILITIES[number]
export type OrganizationCapability = typeof ORGANIZATION_CAPABILITIES[number]
export type MarketingSocialCapability = typeof MARKETING_SOCIAL_CAPABILITIES[number]
export type WorkspaceCapability
  = | PlatformCapability
    | OrganizationCapability
    | MarketingSocialCapability

export const ALL_WORKSPACE_CAPABILITIES: WorkspaceCapability[] = [
  ...PLATFORM_CAPABILITIES,
  ...ORGANIZATION_CAPABILITIES,
  ...MARKETING_SOCIAL_CAPABILITIES,
]

/** Header carrying the organization the client is asking for. Always revalidated server-side. */
export const ORGANIZATION_HEADER = 'X-Organization-Id'
/** Header carrying the tenant the client is asking for. Always revalidated server-side. */
export const TENANT_HEADER = 'X-Tenant-Id'

export function isAgencyOrganization(type?: OrganizationType | null): boolean {
  return type === 'agency'
}

export function isPlatformOrganization(type?: OrganizationType | null): boolean {
  return type === 'platform'
}
