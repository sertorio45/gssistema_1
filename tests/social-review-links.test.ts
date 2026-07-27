import { describe, expect, it } from 'vitest'

import {
  generateReviewToken,
  hashIp,
  hashReviewToken,
  normalizeCommentAnchor,
} from '~/server/utils/social-review-links'

describe('social-review-links', () => {
  it('hashes tokens one-way and never echoes the plaintext in the hash', () => {
    const { token, tokenHash } = generateReviewToken()
    expect(token.length).toBeGreaterThan(20)
    expect(tokenHash).toBe(hashReviewToken(token))
    expect(tokenHash).not.toContain(token)
    expect(tokenHash).toHaveLength(64)
  })

  it('hashes IPs for access logs', () => {
    expect(hashIp(null)).toBeNull()
    expect(hashIp('127.0.0.1')).toBe(hashIp('127.0.0.1'))
    expect(hashIp('127.0.0.1')).not.toBe('127.0.0.1')
  })

  it('validates image anchors', () => {
    expect(() => normalizeCommentAnchor({
      anchorType: 'image',
      xPercent: 10,
      yPercent: 20,
    })).not.toThrow()

    expect(() => normalizeCommentAnchor({
      anchorType: 'image',
      xPercent: 10,
    })).toThrow()
  })

  it('validates carousel and video anchors', () => {
    expect(normalizeCommentAnchor({
      anchorType: 'carousel',
      xPercent: 40,
      yPercent: 50,
      slideIndex: 2,
    }).slideIndex).toBe(2)

    expect(normalizeCommentAnchor({
      anchorType: 'video',
      mediaTimeMs: 15000,
    }).mediaTimeMs).toBe(15000)

    expect(() => normalizeCommentAnchor({
      anchorType: 'video',
    })).toThrow()
  })

  it('clears coordinates for none anchors', () => {
    const row = normalizeCommentAnchor({
      anchorType: 'none',
      xPercent: 10,
      yPercent: 20,
    })
    expect(row.xPercent).toBeNull()
    expect(row.yPercent).toBeNull()
  })
})
