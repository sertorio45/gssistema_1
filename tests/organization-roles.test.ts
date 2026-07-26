import { describe, expect, it } from 'vitest'

import {
  expandCapabilityAliases,
  holdsCapability,
} from '~/constants/workspace'
import {
  assertAssignableCapabilities,
} from '~/server/utils/organization-roles'
import { resolveEffectiveCapabilities } from '~/server/utils/resolve-capabilities'
import { createFakeSupabaseClient } from './helpers/fake-supabase'
import { createWorkspaceDatabase, ids } from './helpers/workspace-fixture'

describe('aliases de capability', () => {
  it('organization.team.manage equivale a organization.members.manage', () => {
    expect(holdsCapability(['organization.team.manage'], 'organization.members.manage')).toBe(true)
    expect(holdsCapability(['organization.members.manage'], 'organization.team.manage')).toBe(true)
  })

  it('marketing.social.approve equivale às aprovações granulares', () => {
    const expanded = expandCapabilityAliases(['marketing.social.approval.internal'])
    expect(expanded.has('marketing.social.approve')).toBe(true)
  })
})

describe('assertAssignableCapabilities', () => {
  it('impede conceder capability superior à do ator', () => {
    expect(() => assertAssignableCapabilities(
      ['organization.read', 'organization.team.read'],
      ['organization.roles.manage'],
    )).toThrow()
  })

  it('permite conceder subset das próprias capabilities', () => {
    expect(() => assertAssignableCapabilities(
      ['organization.read', 'organization.team.manage', 'organization.members.manage'],
      ['organization.team.manage'],
    )).not.toThrow()
  })
})

describe('resolveEffectiveCapabilities', () => {
  it('staff da plataforma recebe o catálogo completo', async () => {
    const client = createFakeSupabaseClient(createWorkspaceDatabase())
    const resolved = await resolveEffectiveCapabilities({
      client,
      userId: ids.platformStaff,
      isPlatformStaff: true,
    })
    expect(resolved.source).toBe('platform')
    expect(resolved.capabilities.length).toBeGreaterThan(10)
  })

  it('deny explícito prevalece sobre allow do cargo', async () => {
    const db = createWorkspaceDatabase()
    db.organization_roles = [
      {
        id: '00000000-0000-4000-8000-00000000r001',
        organization_id: ids.orgAgencyA,
        name: 'Gestor',
        slug: 'marketing_manager',
        is_protected: false,
      },
    ]
    db.organization_role_capabilities = [
      { role_id: '00000000-0000-4000-8000-00000000r001', capability: 'marketing.social.publish', allowed: true },
      { role_id: '00000000-0000-4000-8000-00000000r001', capability: 'marketing.social.read', allowed: true },
    ]
    db.organization_memberships = [{
      id: ids.membershipAgencyOwner,
      organization_id: ids.orgAgencyA,
      user_id: ids.agencyOwner,
      role: 'cliente',
      role_id: '00000000-0000-4000-8000-00000000r001',
      is_active: true,
      access_all_tenants: true,
    }]
    db.tenant_capability_grants = [{
      tenant_id: ids.tenantClientA1,
      user_id: ids.agencyOwner,
      capability: 'marketing.social.publish',
      allowed: false,
    }]

    const resolved = await resolveEffectiveCapabilities({
      client: createFakeSupabaseClient(db),
      userId: ids.agencyOwner,
      organizationId: ids.orgAgencyA,
      tenantId: ids.tenantClientA1,
      organizationRoleId: '00000000-0000-4000-8000-00000000r001',
      modules: ['marketing', 'crm'],
    })

    expect(resolved.capabilities).toContain('marketing.social.read')
    expect(resolved.capabilities).not.toContain('marketing.social.publish')
    expect(resolved.denied).toContain('marketing.social.publish')
  })

  it('módulo marketing ausente remove capabilities de marketing', async () => {
    const db = createWorkspaceDatabase()
    db.organization_roles = [{
      id: '00000000-0000-4000-8000-00000000r002',
      organization_id: ids.orgAgencyA,
      slug: 'owner',
    }]
    db.organization_role_capabilities = [
      { role_id: '00000000-0000-4000-8000-00000000r002', capability: 'organization.read', allowed: true },
      { role_id: '00000000-0000-4000-8000-00000000r002', capability: 'marketing.social.read', allowed: true },
    ]

    const resolved = await resolveEffectiveCapabilities({
      client: createFakeSupabaseClient(db),
      userId: ids.agencyOwner,
      organizationId: ids.orgAgencyA,
      tenantId: ids.tenantClientA1,
      organizationRoleId: '00000000-0000-4000-8000-00000000r002',
      modules: ['crm'],
      enforceModules: true,
    })

    expect(resolved.capabilities).toContain('organization.read')
    expect(resolved.capabilities).not.toContain('marketing.social.read')
  })
})
