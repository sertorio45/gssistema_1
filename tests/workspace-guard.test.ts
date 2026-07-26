import { describe, expect, it } from 'vitest'

import { navMenuOrganization } from '~/constants/menus'
import { canEnterWorkspaceRoute } from '~/utils/workspace-guard'

const agencyOwnerScope = {
  capabilities: [
    'organization.read',
    'organization.manage',
    'organization.members.manage',
    'organization.team.manage',
    'organization.roles.read',
    'organization.tenants.read',
    'agency.clients.read',
  ],
  organizationType: 'agency' as const,
}

const directOwnerScope = {
  ...agencyOwnerScope,
  organizationType: 'direct' as const,
}

describe('guarda de rotas por tipo de organização', () => {
  it('cliente direto não acessa páginas exclusivas de agência', () => {
    const agencyOnly = { organizationTypes: ['agency'] as const }

    expect(canEnterWorkspaceRoute(agencyOwnerScope, agencyOnly)).toBe(true)
    expect(canEnterWorkspaceRoute(directOwnerScope, agencyOnly)).toBe(false)
  })

  it('a carteira de clientes fica invisível para cliente direto', () => {
    const clients = navMenuOrganization[0]!.items.find(
      item => 'link' in item && item.link === '/organization/clients',
    )!

    const requirements = {
      capability: 'capability' in clients ? clients.capability : null,
      organizationTypes: 'organizationTypes' in clients ? clients.organizationTypes : null,
    }

    expect(canEnterWorkspaceRoute(agencyOwnerScope, requirements)).toBe(true)
    expect(canEnterWorkspaceRoute(directOwnerScope, requirements)).toBe(false)
  })

  it('a equipe da organização fica visível para agência e cliente direto', () => {
    const team = navMenuOrganization[0]!.items.find(
      item => 'link' in item && item.link === '/organization/team',
    )!

    const requirements = {
      capability: 'capability' in team ? team.capability : null,
      organizationTypes: 'organizationTypes' in team ? team.organizationTypes : null,
    }

    expect(canEnterWorkspaceRoute(agencyOwnerScope, requirements)).toBe(true)
    expect(canEnterWorkspaceRoute(directOwnerScope, requirements)).toBe(true)
  })

  it('capability ausente bloqueia a rota', () => {
    const collaboratorScope = {
      capabilities: ['organization.read', 'organization.tenants.read'],
      organizationType: 'agency' as const,
    }

    expect(canEnterWorkspaceRoute(collaboratorScope, {
      capability: 'organization.members.manage',
    })).toBe(false)
  })

  it('sem organização resolvida nenhuma rota tipada é liberada', () => {
    expect(canEnterWorkspaceRoute(
      { capabilities: ['organization.read'], organizationType: null },
      { organizationTypes: ['agency'] },
    )).toBe(false)
  })
})
