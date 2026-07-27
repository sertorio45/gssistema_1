import { describe, expect, it } from 'vitest'

import { navMenu, navMenuOrganization } from '~/constants/menus'
import { canEnterWorkspaceRoute, matchesNavAudience } from '~/utils/workspace-guard'
import type { NavGroup, NavLink } from '~/types/nav'

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

function findOrgChild(groupTitle: string, link: string): NavLink {
  const group = navMenuOrganization[0]!.items.find(
    (item): item is NavGroup => 'children' in item && item.title === groupTitle,
  )!
  return group.children.find(child => child.link === link)!
}

describe('guarda de rotas por tipo de organização', () => {
  it('cliente direto não acessa páginas exclusivas de agência', () => {
    const agencyOnly = { organizationTypes: ['agency'] as const }

    expect(canEnterWorkspaceRoute(agencyOwnerScope, agencyOnly)).toBe(true)
    expect(canEnterWorkspaceRoute(directOwnerScope, agencyOnly)).toBe(false)
  })

  it('a carteira de clientes fica invisível para cliente direto', () => {
    const clients = findOrgChild('Agência', '/organization/clients')

    const requirements = {
      capability: clients.capability ?? null,
      organizationTypes: clients.organizationTypes ?? null,
    }

    expect(canEnterWorkspaceRoute(agencyOwnerScope, requirements)).toBe(true)
    expect(canEnterWorkspaceRoute(directOwnerScope, requirements)).toBe(false)
  })

  it('a equipe da organização fica visível para agência e cliente direto', () => {
    const team = findOrgChild('Organização', '/organization/team')

    const requirements = {
      capability: team.capability ?? null,
      organizationTypes: team.organizationTypes ?? null,
    }

    expect(canEnterWorkspaceRoute(agencyOwnerScope, requirements)).toBe(true)
    expect(canEnterWorkspaceRoute(directOwnerScope, requirements)).toBe(true)
  })

  it('menu da agência não duplica rotas de marketing', () => {
    const agency = navMenuOrganization[0]!.items.find(
      (item): item is NavGroup => 'children' in item && item.title === 'Agência',
    )!
    const links = agency.children.map(child => child.link)
    expect(links.some(link => link.startsWith('/marketing'))).toBe(false)
    expect(links).toContain('/organization/clients')
    expect(links).toContain('/organization')
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

  it('audience agency esconde itens do portal do cliente', () => {
    const clientScope = {
      capabilities: ['marketing.social.read'],
      organizationType: 'direct' as const,
      isClientExperience: true,
    }
    const agencyScope = {
      capabilities: ['marketing.social.read', 'agency.clients.read'],
      organizationType: 'agency' as const,
      isClientExperience: false,
    }

    expect(canEnterWorkspaceRoute(clientScope, { audience: 'agency' })).toBe(false)
    expect(canEnterWorkspaceRoute(agencyScope, { audience: 'agency' })).toBe(true)
    expect(canEnterWorkspaceRoute(clientScope, { audience: 'both' })).toBe(true)
  })
  it('menu marketing marca ops de agência', () => {
    const marketing = navMenu
      .flatMap(section => section.items)
      .find((item): item is NavGroup => 'children' in item && item.title === 'Marketing')!

    const packages = marketing.children.find(child => child.link === '/marketing/packages')!
    const calendar = marketing.children.find(child => child.link === '/marketing/calendar')!
    const approvals = marketing.children.find(child => child.link === '/marketing/approvals')!

    expect(packages.audience).toBe('agency')
    expect(approvals.audience).toBe('agency')
    expect(calendar.title).toBe('Calendário')
  })
})

describe('matchesNavAudience', () => {
  it('defaults to both when audience is omitted', () => {
    expect(matchesNavAudience(undefined, true)).toBe(true)
    expect(matchesNavAudience(null, false)).toBe(true)
  })

  it('client audience only for client experience', () => {
    expect(matchesNavAudience('client', true)).toBe(true)
    expect(matchesNavAudience('client', false)).toBe(false)
  })

  it('client portal marketing whitelist is exactly the basic surface', async () => {
    const { CLIENT_PORTAL_MARKETING_LINKS, isClientPortalMarketingLink } = await import('~/constants/marketing-audience')
    expect([...CLIENT_PORTAL_MARKETING_LINKS]).toEqual([
      '/marketing',
      '/marketing/calendar',
      '/marketing/posts',
      '/marketing/reports',
      '/marketing/integrations',
    ])
    expect(isClientPortalMarketingLink('/marketing/packages')).toBe(false)
    expect(isClientPortalMarketingLink('/marketing/posts')).toBe(true)
    expect(isClientPortalMarketingLink('/marketing/posts/new')).toBe(true)
    expect(isClientPortalMarketingLink('/marketing/posts/tasks')).toBe(false)
    expect(isClientPortalMarketingLink('/marketing/calendar')).toBe(true)
  })
})
