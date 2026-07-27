import type { FakeDatabase } from './fake-supabase'

import { TEST_CLIENT_KEY, TEST_USER_KEY } from '../mocks/supabase-server'
import { createFakeSupabaseClient } from './fake-supabase'

/** Readable identifiers that still satisfy the resolver's UUID validation. */
function id(suffix: string): string {
  return `00000000-0000-4000-8000-${suffix.padStart(12, '0')}`
}

export const ids = {
  orgAgencyA: id('a1'),
  orgAgencyB: id('b1'),
  orgDirect: id('d1'),

  tenantAgencyAOwn: id('a100'),
  tenantClientA1: id('a101'),
  tenantClientA2: id('a102'),
  tenantClientB1: id('b101'),
  tenantDirect: id('d100'),

  platformStaff: id('f001'),
  agencyOwner: id('f002'),
  agencyCollaborator: id('f003'),
  agencyBOwner: id('f004'),
  clientUser: id('f005'),
  directOwner: id('f006'),
  stranger: id('f007'),

  membershipAgencyOwner: id('e001'),
  membershipAgencyCollaborator: id('e002'),
  membershipAgencyBOwner: id('e003'),
  membershipDirectOwner: id('e004'),
} as const

/**
 * Mirrors the defaults seeded by the marketing and workspace migrations, so a
 * capability failing here would also fail in the database.
 */
const ROLE_CAPABILITIES = [
  ...[
    'organization.read',
    'organization.manage',
    'organization.members.manage',
    'organization.team.read',
    'organization.team.manage',
    'marketing.social.read',
    'marketing.social.create',
    'marketing.social.update',
    'marketing.social.comment',
    'marketing.social.schedule',
    'marketing.social.publish',
    'marketing.social.reports',
    'marketing.social.integrations',
  ].map(capability => ({ role: 'cliente', capability, tenant_id: null })),
  ...[
    'organization.read',
    'marketing.social.read',
    'marketing.social.comment',
  ].map(capability => ({ role: 'atendente', capability, tenant_id: null })),
]

export function createWorkspaceDatabase(): FakeDatabase {
  const tenants = [
    { id: ids.tenantAgencyAOwn, name: 'Agência A', slug: 'agencia-a', is_active: true },
    { id: ids.tenantClientA1, name: 'Cliente A1', slug: 'cliente-a1', is_active: true },
    { id: ids.tenantClientA2, name: 'Cliente A2', slug: 'cliente-a2', is_active: true },
    { id: ids.tenantClientB1, name: 'Cliente B1', slug: 'cliente-b1', is_active: true },
    { id: ids.tenantDirect, name: 'Cliente Direto', slug: 'cliente-direto', is_active: true },
  ]

  return {
    tenant: tenants,

    organizations: [
      {
        id: ids.orgAgencyA,
        name: 'Agência A',
        slug: 'agencia-a',
        type: 'agency',
        is_active: true,
        tenant_id: ids.tenantAgencyAOwn,
        settings: {},
      },
      {
        id: ids.orgAgencyB,
        name: 'Agência B',
        slug: 'agencia-b',
        type: 'agency',
        is_active: true,
        tenant_id: null,
        settings: {},
      },
      {
        id: ids.orgDirect,
        name: 'Cliente Direto',
        slug: 'direct-cliente-direto',
        type: 'direct',
        is_active: true,
        tenant_id: ids.tenantDirect,
        settings: {},
      },
    ],

    organization_tenants: [
      {
        organization_id: ids.orgAgencyA,
        tenant_id: ids.tenantAgencyAOwn,
        relationship_type: 'owner',
        is_primary: true,
        is_active: true,
        ended_at: null,
      },
      {
        organization_id: ids.orgAgencyA,
        tenant_id: ids.tenantClientA1,
        relationship_type: 'managed',
        is_primary: false,
        is_active: true,
        ended_at: null,
      },
      {
        organization_id: ids.orgAgencyA,
        tenant_id: ids.tenantClientA2,
        relationship_type: 'managed',
        is_primary: false,
        is_active: true,
        ended_at: null,
      },
      {
        organization_id: ids.orgAgencyB,
        tenant_id: ids.tenantClientB1,
        relationship_type: 'managed',
        is_primary: false,
        is_active: true,
        ended_at: null,
      },
      {
        organization_id: ids.orgDirect,
        tenant_id: ids.tenantDirect,
        relationship_type: 'owner',
        is_primary: true,
        is_active: true,
        ended_at: null,
      },
    ],

    organization_memberships: [
      {
        id: ids.membershipAgencyOwner,
        organization_id: ids.orgAgencyA,
        user_id: ids.agencyOwner,
        role: 'cliente',
        is_active: true,
        access_all_tenants: true,
      },
      {
        id: ids.membershipAgencyCollaborator,
        organization_id: ids.orgAgencyA,
        user_id: ids.agencyCollaborator,
        role: 'atendente',
        is_active: true,
        access_all_tenants: false,
      },
      {
        id: ids.membershipAgencyBOwner,
        organization_id: ids.orgAgencyB,
        user_id: ids.agencyBOwner,
        role: 'cliente',
        is_active: true,
        access_all_tenants: true,
      },
      {
        id: ids.membershipDirectOwner,
        organization_id: ids.orgDirect,
        user_id: ids.directOwner,
        role: 'cliente',
        is_active: true,
        access_all_tenants: true,
      },
    ],

    organization_member_tenants: [
      {
        id: id('c001'),
        organization_membership_id: ids.membershipAgencyCollaborator,
        tenant_id: ids.tenantClientA1,
        is_active: true,
      },
    ],

    user_tenant_role: [
      { user_id: ids.clientUser, tenant_id: ids.tenantClientA1, role: 'cliente' },
    ],

    tenant_modules: tenants.map(tenant => ({
      tenant_id: tenant.id,
      module_name: 'all',
      is_active: true,
    })),

    role_capabilities: ROLE_CAPABILITIES,

    tenant_capability_grants: [],
  }
}

export interface FakeEventInput {
  userId: string | null
  role?: 'admin' | 'funcionario' | 'cliente' | 'atendente' | null
  headers?: Record<string, string>
  query?: Record<string, string>
  tenantRoles?: Record<string, string>
  db?: FakeDatabase
}

/**
 * Builds the plain object shape h3 helpers rely on (`node.req.headers`, `path`)
 * plus the hooks read by the Supabase test double.
 */
export function createFakeEvent(input: FakeEventInput) {
  const headers: Record<string, string> = {}
  for (const [key, value] of Object.entries(input.headers ?? {}))
    headers[key.toLowerCase()] = value

  const search = new URLSearchParams(input.query ?? {}).toString()
  const path = search ? `/api/test?${search}` : '/api/test'

  const user = input.userId
    ? {
        id: input.userId,
        app_metadata: {
          role: input.role ?? null,
          tenant_roles: input.tenantRoles ?? {},
        },
      }
    : null

  return {
    path,
    node: { req: { url: path, headers, method: 'GET' } },
    context: {},
    [TEST_USER_KEY]: user,
    [TEST_CLIENT_KEY]: createFakeSupabaseClient(input.db ?? createWorkspaceDatabase()),
  } as any
}
