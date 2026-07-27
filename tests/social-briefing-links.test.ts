import { describe, expect, it } from 'vitest'

import {
  DEFAULT_BRIEFING_FIELDS,
  generateBriefingToken,
  hashBriefingToken,
} from '~/server/utils/social-briefing-links'

describe('social briefing links', () => {
  it('hashes tokens stably and never equals plaintext', () => {
    const { token, tokenHash } = generateBriefingToken()
    expect(tokenHash).toBe(hashBriefingToken(token))
    expect(tokenHash).not.toBe(token)
    expect(tokenHash).toHaveLength(64)
  })

  it('exposes default briefing fields for public form', () => {
    expect(DEFAULT_BRIEFING_FIELDS.some(field => field.key === 'objective')).toBe(true)
    expect(DEFAULT_BRIEFING_FIELDS.some(field => field.key === 'cta')).toBe(true)
  })
})
