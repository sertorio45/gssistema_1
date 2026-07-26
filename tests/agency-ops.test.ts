import { describe, expect, it } from 'vitest'

import { AGENCY_ONBOARDING_STEPS } from '~/constants/workspace'
import {
  extractAgencyBranding,
  mergeAgencyBranding,
} from '~/server/utils/agency-ops'
import { canEnterWorkspaceRoute } from '~/utils/workspace-guard'

describe('agency branding settings', () => {
  it('reads branding without coupling to a single agency identity', () => {
    const branding = extractAgencyBranding({
      branding: {
        commercial_name: 'Studio Norte',
        primary_color: '#111827',
        custom_domain: 'app.studionorte.com',
      },
      unrelated: true,
    })

    expect(branding.commercial_name).toBe('Studio Norte')
    expect(branding.custom_domain).toBe('app.studionorte.com')
    expect(branding.logo_url).toBeNull()
  })

  it('merges branding without wiping sibling settings keys', () => {
    const next = mergeAgencyBranding(
      { branding: { commercial_name: 'A' }, feature_flags: { beta: true } },
      { commercial_name: 'B', invite_display_name: 'Equipe B' },
    )

    expect(next.feature_flags).toEqual({ beta: true })
    expect((next.branding as any).commercial_name).toBe('B')
    expect((next.branding as any).invite_display_name).toBe('Equipe B')
  })
})

describe('agency menu gating', () => {
  it('hides agency ops from direct organizations', () => {
    expect(canEnterWorkspaceRoute(
      { capabilities: ['agency.clients.read'], organizationType: 'direct' },
      { capability: 'agency.clients.read', organizationTypes: ['agency'] },
    )).toBe(false)
  })

  it('allows agency ops when capability and type match', () => {
    expect(canEnterWorkspaceRoute(
      { capabilities: ['agency.clients.read'], organizationType: 'agency' },
      { capability: 'agency.clients.read', organizationTypes: ['agency'] },
    )).toBe(true)
  })

  it('keeps onboarding steps ordered and complete', () => {
    expect(AGENCY_ONBOARDING_STEPS).toEqual([
      'client_data',
      'tenant',
      'modules',
      'agency_owners',
      'client_invite',
      'approval_flow',
      'social_connect',
      'review',
    ])
  })
})
