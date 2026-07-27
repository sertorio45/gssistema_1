import { describe, expect, it } from 'vitest'

import { resolveSafeRedirect } from '~/utils/safe-redirect'

describe('resolveSafeRedirect', () => {
  it('allows same-origin relative paths', () => {
    expect(resolveSafeRedirect('/marketing/posts')).toBe('/marketing/posts')
    expect(resolveSafeRedirect('/marketing/posts?status=draft')).toBe('/marketing/posts?status=draft')
  })

  it('blocks open redirects', () => {
    expect(resolveSafeRedirect('https://evil.com')).toBe('/')
    expect(resolveSafeRedirect('//evil.com')).toBe('/')
    expect(resolveSafeRedirect('\\evil.com')).toBe('/')
    expect(resolveSafeRedirect('javascript:alert(1)')).toBe('/')
    expect(resolveSafeRedirect(null)).toBe('/')
    expect(resolveSafeRedirect('')).toBe('/')
  })
})
