import { describe, expect, it } from 'vitest'

import {
  listAccessibleOrganizations,
  listAccessibleTenants,
  requireWorkspaceContext,
} from '~/server/utils/workspace-context'
import { createFakeSupabaseClient } from './helpers/fake-supabase'
import { createFakeEvent, createWorkspaceDatabase, ids } from './helpers/workspace-fixture'

const TENANT_HEADER = 'X-Tenant-Id'
const ORGANIZATION_HEADER = 'X-Organization-Id'

/**
 * Unwraps whatever h3 threw. Asserting the message too keeps a test from passing
 * because of an unrelated rejection.
 */
async function failureOf(promise: Promise<unknown>): Promise<{ status: number, message: string }> {
  try {
    await promise
    return { status: 200, message: '' }
  }
  catch (error: any) {
    return {
      status: Number(error?.statusCode ?? 500),
      message: String(error?.statusMessage ?? error?.message ?? ''),
    }
  }
}

async function statusOf(promise: Promise<unknown>): Promise<number> {
  return (await failureOf(promise)).status
}

describe('modelo 1 — plataforma', () => {
  it('staff da plataforma acessa uma agência e seus clientes', async () => {
    const event = createFakeEvent({
      userId: ids.platformStaff,
      role: 'admin',
      headers: {
        [ORGANIZATION_HEADER]: ids.orgAgencyA,
        [TENANT_HEADER]: ids.tenantClientA1,
      },
    })

    const context = await requireWorkspaceContext(event, {
      organizationId: ids.orgAgencyA,
      tenantId: ids.tenantClientA1,
    })

    expect(context.isPlatformStaff).toBe(true)
    expect(context.organization?.type).toBe('agency')
    expect(context.tenantId).toBe(ids.tenantClientA1)
    expect(context.organizationTenantLink?.relationshipType).toBe('managed')
    expect(context.canAccessAllOrganizationTenants).toBe(true)
    expect(context.has('platform.organizations.manage')).toBe(true)
  })

  it('staff da plataforma acessa um cliente direto', async () => {
    const event = createFakeEvent({ userId: ids.platformStaff, role: 'funcionario' })

    const context = await requireWorkspaceContext(event, {
      organizationId: ids.orgDirect,
      tenantId: ids.tenantDirect,
    })

    expect(context.organization?.type).toBe('direct')
    expect(context.organizationTenantLink?.isPrimary).toBe(true)
    expect(context.tenantRole).toBe('funcionario')
  })

  it('staff da plataforma enxerga todas as organizações e empresas', async () => {
    const client = createFakeSupabaseClient(createWorkspaceDatabase())

    const organizations = await listAccessibleOrganizations(client, {
      userId: ids.platformStaff,
      isPlatformStaff: true,
    })
    const tenants = await listAccessibleTenants(client, {
      userId: ids.platformStaff,
      isPlatformStaff: true,
    })

    expect(organizations.map(item => item.id)).toEqual(
      expect.arrayContaining([ids.orgAgencyA, ids.orgAgencyB, ids.orgDirect]),
    )
    expect(tenants).toHaveLength(5)
  })
})

describe('modelo 2 — agência', () => {
  it('proprietário da agência acessa todos os clientes da própria carteira', async () => {
    for (const tenantId of [ids.tenantAgencyAOwn, ids.tenantClientA1, ids.tenantClientA2]) {
      const event = createFakeEvent({ userId: ids.agencyOwner, role: 'cliente' })
      const context = await requireWorkspaceContext(event, {
        organizationId: ids.orgAgencyA,
        tenantId,
      })

      expect(context.tenantId).toBe(tenantId)
      expect(context.organizationRole).toBe('cliente')
      expect(context.has('organization.members.manage')).toBe(true)
    }
  })

  it('colaborador da agência acessa somente os tenants atribuídos', async () => {
    const assigned = createFakeEvent({ userId: ids.agencyCollaborator, role: 'cliente' })
    const context = await requireWorkspaceContext(assigned, {
      organizationId: ids.orgAgencyA,
      tenantId: ids.tenantClientA1,
    })

    expect(context.tenantId).toBe(ids.tenantClientA1)
    expect(context.canAccessAllOrganizationTenants).toBe(false)
    expect(context.has('organization.members.manage')).toBe(false)

    const notAssigned = createFakeEvent({ userId: ids.agencyCollaborator, role: 'cliente' })
    expect(await failureOf(requireWorkspaceContext(notAssigned, {
      organizationId: ids.orgAgencyA,
      tenantId: ids.tenantClientA2,
    }))).toEqual({
      status: 403,
      message: 'Colaborador não atribuído a esta empresa',
    })
  })

  it('a listagem do colaborador traz apenas a empresa atribuída', async () => {
    const client = createFakeSupabaseClient(createWorkspaceDatabase())

    const tenants = await listAccessibleTenants(client, {
      userId: ids.agencyCollaborator,
      isPlatformStaff: false,
    })

    expect(tenants.map(item => item.id)).toEqual([ids.tenantClientA1])
  })

  it('colaborador da agência A não acessa dados da agência B', async () => {
    const byTenant = createFakeEvent({ userId: ids.agencyCollaborator, role: 'cliente' })
    expect(await failureOf(requireWorkspaceContext(byTenant, {
      tenantId: ids.tenantClientB1,
    }))).toEqual({ status: 403, message: 'Sem acesso a esta empresa' })

    const byOrganization = createFakeEvent({ userId: ids.agencyCollaborator, role: 'cliente' })
    expect(await failureOf(requireWorkspaceContext(byOrganization, {
      organizationId: ids.orgAgencyB,
    }))).toEqual({ status: 403, message: 'Sem acesso a esta organização' })

    const client = createFakeSupabaseClient(createWorkspaceDatabase())
    const organizations = await listAccessibleOrganizations(client, {
      userId: ids.agencyOwner,
      isPlatformStaff: false,
    })
    expect(organizations.map(item => item.id)).toEqual([ids.orgAgencyA])
  })

  it('proprietário da agência não recebe capabilities de plataforma', async () => {
    const event = createFakeEvent({ userId: ids.agencyOwner, role: 'cliente' })
    const context = await requireWorkspaceContext(event, { organizationId: ids.orgAgencyA })

    expect(context.isPlatformStaff).toBe(false)
    expect(context.has('platform.organizations.manage')).toBe(false)
    expect(await statusOf(requireWorkspaceContext(
      createFakeEvent({ userId: ids.agencyOwner, role: 'cliente' }),
      { organizationId: ids.orgAgencyA, platformOnly: true },
    ))).toBe(403)
  })
})

describe('modelo 3 — cliente direto', () => {
  it('cliente direto acessa o próprio tenant principal', async () => {
    const event = createFakeEvent({ userId: ids.directOwner, role: 'cliente' })
    const context = await requireWorkspaceContext(event, { tenantId: ids.tenantDirect })

    expect(context.organization?.type).toBe('direct')
    expect(context.organizationTenantLink?.relationshipType).toBe('owner')
    expect(context.tenantRole).toBe('cliente')
  })

  it('cliente direto não alcança tenants de agência', async () => {
    const event = createFakeEvent({ userId: ids.directOwner, role: 'cliente' })
    expect(await statusOf(requireWorkspaceContext(event, {
      tenantId: ids.tenantClientA1,
    }))).toBe(403)
  })

  it('usuário de cliente acessa somente o próprio tenant', async () => {
    const own = createFakeEvent({ userId: ids.clientUser, role: 'cliente' })
    const context = await requireWorkspaceContext(own, { tenantId: ids.tenantClientA1 })
    expect(context.tenantRole).toBe('cliente')

    const sibling = createFakeEvent({ userId: ids.clientUser, role: 'cliente' })
    expect(await statusOf(requireWorkspaceContext(sibling, {
      tenantId: ids.tenantClientA2,
    }))).toBe(403)
  })
})

describe('ciclo de vida do vínculo', () => {
  it('tenant removido da carteira deixa de ser acessível', async () => {
    const db = createWorkspaceDatabase()
    const link = db.organization_tenants!.find(
      row => row.tenant_id === ids.tenantClientA2 && row.organization_id === ids.orgAgencyA,
    )!
    link.is_active = false
    link.ended_at = new Date(Date.now() - 60_000).toISOString()

    const event = createFakeEvent({ userId: ids.agencyOwner, role: 'cliente', db })
    expect(await failureOf(requireWorkspaceContext(event, {
      organizationId: ids.orgAgencyA,
      tenantId: ids.tenantClientA2,
    }))).toEqual({
      status: 403,
      message: 'Empresa não vinculada a esta organização',
    })

    const tenants = await listAccessibleTenants(createFakeSupabaseClient(db), {
      userId: ids.agencyOwner,
      isPlatformStaff: false,
    })
    expect(tenants.map(item => item.id)).not.toContain(ids.tenantClientA2)
  })

  it('organização inativa bloqueia o acesso', async () => {
    const db = createWorkspaceDatabase()
    db.organizations!.find(row => row.id === ids.orgAgencyA)!.is_active = false

    const event = createFakeEvent({ userId: ids.agencyOwner, role: 'cliente', db })
    expect(await statusOf(requireWorkspaceContext(event, {
      organizationId: ids.orgAgencyA,
    }))).toBe(403)
  })

  it('membership inativo perde o acesso', async () => {
    const db = createWorkspaceDatabase()
    db.organization_memberships!.find(
      row => row.id === ids.membershipAgencyOwner,
    )!.is_active = false

    const event = createFakeEvent({ userId: ids.agencyOwner, role: 'cliente', db })
    expect(await statusOf(requireWorkspaceContext(event, {
      organizationId: ids.orgAgencyA,
    }))).toBe(403)
  })

  it('empresa não vinculada à organização solicitada é recusada', async () => {
    const event = createFakeEvent({ userId: ids.platformStaff, role: 'admin' })
    expect(await statusOf(requireWorkspaceContext(event, {
      organizationId: ids.orgAgencyA,
      tenantId: ids.tenantClientB1,
    }))).toBe(403)
  })
})

describe('entrada não confiável', () => {
  it('trocar o header X-Tenant-Id por um tenant de outra agência retorna 403', async () => {
    const event = createFakeEvent({
      userId: ids.agencyOwner,
      role: 'cliente',
      headers: { [TENANT_HEADER]: ids.tenantClientB1 },
    })

    expect(await failureOf(requireWorkspaceContext(event)))
      .toEqual({ status: 403, message: 'Sem acesso a esta empresa' })
  })

  it('trocar o header X-Organization-Id por outra agência retorna 403', async () => {
    const event = createFakeEvent({
      userId: ids.agencyCollaborator,
      role: 'cliente',
      headers: { [ORGANIZATION_HEADER]: ids.orgAgencyB },
    })

    expect(await failureOf(requireWorkspaceContext(event)))
      .toEqual({ status: 403, message: 'Sem acesso a esta organização' })
  })

  it('forjar tenant_id na query string retorna 403', async () => {
    const event = createFakeEvent({
      userId: ids.clientUser,
      role: 'cliente',
      query: { tenant_id: ids.tenantClientA2 },
    })

    expect(await failureOf(requireWorkspaceContext(event)))
      .toEqual({ status: 403, message: 'Sem acesso a esta empresa' })
  })

  it('role global forjado no cliente não promove ninguém a staff', async () => {
    // `role: cliente` in app_metadata is the only source considered; the header is noise.
    const event = createFakeEvent({
      userId: ids.agencyOwner,
      role: 'cliente',
      headers: { 'x-user-role': 'admin', [ORGANIZATION_HEADER]: ids.orgAgencyA },
    })

    const context = await requireWorkspaceContext(event)
    expect(context.isPlatformStaff).toBe(false)
    expect(context.globalRole).toBe('cliente')
  })

  it('ids inexistentes retornam 404 e não vazam existência', async () => {
    const event = createFakeEvent({ userId: ids.agencyOwner, role: 'cliente' })
    expect(await statusOf(requireWorkspaceContext(event, {
      organizationId: '00000000-0000-4000-8000-0000000000ff',
    }))).toBe(404)
  })

  it('requisição sem autenticação retorna 401', async () => {
    const event = createFakeEvent({ userId: null })
    expect(await statusOf(requireWorkspaceContext(event, {
      tenantId: ids.tenantClientA1,
    }))).toBe(401)
  })

  it('usuário sem nenhum vínculo não alcança nada', async () => {
    const event = createFakeEvent({ userId: ids.stranger, role: 'cliente' })
    expect(await statusOf(requireWorkspaceContext(event, {
      tenantId: ids.tenantClientA1,
    }))).toBe(403)

    const tenants = await listAccessibleTenants(createFakeSupabaseClient(createWorkspaceDatabase()), {
      userId: ids.stranger,
      isPlatformStaff: false,
    })
    expect(tenants).toEqual([])
  })
})

describe('módulos e capabilities', () => {
  it('módulo não contratado é recusado para quem não é staff', async () => {
    const db = createWorkspaceDatabase()
    db.tenant_modules = db.tenant_modules!.filter(row => row.tenant_id !== ids.tenantClientA1)
    db.tenant_modules.push({
      tenant_id: ids.tenantClientA1,
      module_name: 'crm',
      is_active: true,
    })

    const event = createFakeEvent({ userId: ids.agencyOwner, role: 'cliente', db })
    expect(await statusOf(requireWorkspaceContext(event, {
      organizationId: ids.orgAgencyA,
      tenantId: ids.tenantClientA1,
      module: 'marketing',
    }))).toBe(403)

    const staffEvent = createFakeEvent({ userId: ids.platformStaff, role: 'admin', db })
    const staffContext = await requireWorkspaceContext(staffEvent, {
      organizationId: ids.orgAgencyA,
      tenantId: ids.tenantClientA1,
      module: 'marketing',
    })
    expect(staffContext.isPlatformStaff).toBe(true)
  })

  it('capability ausente é recusada mesmo com contexto válido', async () => {
    const event = createFakeEvent({ userId: ids.agencyCollaborator, role: 'cliente' })
    expect(await statusOf(requireWorkspaceContext(event, {
      organizationId: ids.orgAgencyA,
      tenantId: ids.tenantClientA1,
      capability: 'marketing.social.approve',
    }))).toBe(403)
  })

  it('override por tenant revoga uma capability padrão do papel', async () => {
    const db = createWorkspaceDatabase()
    db.tenant_capability_grants!.push({
      tenant_id: ids.tenantClientA1,
      user_id: ids.agencyOwner,
      capability: 'marketing.social.publish',
      allowed: false,
    })

    const event = createFakeEvent({ userId: ids.agencyOwner, role: 'cliente', db })
    const context = await requireWorkspaceContext(event, {
      organizationId: ids.orgAgencyA,
      tenantId: ids.tenantClientA1,
    })

    expect(context.has('marketing.social.publish')).toBe(false)
    expect(context.has('marketing.social.approve')).toBe(true)
  })

  it('requireTenant e requireOrganization sinalizam contexto faltante', async () => {
    const noTenant = createFakeEvent({ userId: ids.agencyOwner, role: 'cliente' })
    expect(await statusOf(requireWorkspaceContext(noTenant, {
      organizationId: ids.orgAgencyA,
      requireTenant: true,
    }))).toBe(400)

    const noOrganization = createFakeEvent({ userId: ids.platformStaff, role: 'admin' })
    expect(await statusOf(requireWorkspaceContext(noOrganization, {
      requireOrganization: true,
    }))).toBe(400)
  })
})
