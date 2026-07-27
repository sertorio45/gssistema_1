import { describe, expect, it } from 'vitest'

import {
  addBusinessDays,
  assertPackageAllowsNewPost,
  businessDaysBetween,
  computePackageUsage,
  DEFAULT_SLA_DAYS,
  SOCIAL_SLA_STAGE_KEYS,
} from '~/server/utils/social-packages'
import {
  filterCalendarPosts,
  findCalendarConflicts,
  findCalendarGaps,
} from '~/utils/social-calendar'

function createPackageClient(options: {
  pkg: Record<string, unknown> | null
  posts?: Array<Record<string, unknown>>
  campaignsCount?: number
}) {
  return {
    from(table: string) {
      const state: {
        filters: Array<{ op: string, col: string, val: unknown }>
        countHead: boolean
      } = { filters: [], countHead: false }

      const chain: any = {
        select(_cols?: string, opts?: { count?: string, head?: boolean }) {
          state.countHead = Boolean(opts?.head && opts?.count)
          return chain
        },
        eq(col: string, val: unknown) {
          state.filters.push({ op: 'eq', col, val })
          return chain
        },
        lte() { return chain },
        gte() { return chain },
        or() { return chain },
        order() { return chain },
        limit() { return chain },
        is() { return chain },
        not() { return chain },
        async maybeSingle() {
          if (table === 'social_client_packages')
            return { data: options.pkg }
          return { data: null }
        },
        then(resolve: (value: any) => void) {
          if (table === 'social_posts')
            return Promise.resolve({ data: options.posts || [] }).then(resolve)
          if (table === 'social_campaigns')
            return Promise.resolve({ count: options.campaignsCount || 0, data: null }).then(resolve)
          return Promise.resolve({ data: [] }).then(resolve)
        },
      }
      return chain
    },
  }
}

describe('social packages SLA helpers', () => {
  it('exposes all SLA stages with defaults', () => {
    expect(SOCIAL_SLA_STAGE_KEYS).toHaveLength(7)
    for (const key of SOCIAL_SLA_STAGE_KEYS)
      expect(DEFAULT_SLA_DAYS[key]).toBeGreaterThan(0)
  })

  it('adds business days skipping weekends', () => {
    const friday = new Date(2026, 6, 24) // local Friday
    const next = addBusinessDays(friday, 1)
    expect(next.getDay()).toBe(1)
  })

  it('counts business days between dates', () => {
    const fri = new Date(2026, 6, 24, 12)
    const mon = new Date(2026, 6, 27, 12)
    expect(businessDaysBetween(fri, mon)).toBe(1)
  })
})

describe('package usage and gate', () => {
  const basePkg = {
    id: 'pkg-1',
    name: 'Mensal',
    status: 'active',
    starts_at: '2026-07-01',
    ends_at: '2026-07-31',
    posts_quota: 2,
    reels_quota: 1,
    stories_quota: 5,
    campaigns_quota: 1,
  }

  it('computes remaining and excess', async () => {
    const client = createPackageClient({
      pkg: basePkg,
      posts: [
        { id: '1', editorial_status: 'approved', publication_status: 'published', social_post_variants: [{ format: 'video' }] },
        { id: '2', editorial_status: 'draft', publication_status: 'not_scheduled', social_post_variants: [{ format: 'story' }] },
        { id: '3', editorial_status: 'draft', publication_status: 'not_scheduled', social_post_variants: [{ format: 'static' }] },
      ],
      campaignsCount: 2,
    })
    const usage = await computePackageUsage(client, 'tenant-1', basePkg)
    expect(usage.posts.produced).toBe(3)
    expect(usage.posts.excess).toBe(1)
    expect(usage.reels.produced).toBe(1)
    expect(usage.stories.produced).toBe(1)
    expect(usage.campaigns.excess).toBe(1)
    expect(usage.overQuota).toBe(true)
  })

  it('blocks new post when quota is exhausted', async () => {
    const client = createPackageClient({
      pkg: basePkg,
      posts: [
        { id: '1', editorial_status: 'draft', publication_status: null, social_post_variants: [] },
        { id: '2', editorial_status: 'draft', publication_status: null, social_post_variants: [] },
      ],
    })
    await expect(assertPackageAllowsNewPost(client, 'tenant-1')).rejects.toMatchObject({
      statusCode: 409,
    })
  })

  it('allows new post when posts_quota is zero (unlimited)', async () => {
    const client = createPackageClient({
      pkg: { ...basePkg, posts_quota: 0 },
      posts: Array.from({ length: 10 }, (_, i) => ({
        id: String(i),
        editorial_status: 'draft',
        publication_status: null,
        social_post_variants: [],
      })),
    })
    const result = await assertPackageAllowsNewPost(client, 'tenant-1')
    expect(result.package?.id).toBe('pkg-1')
    expect(result.warned).toBe(false)
  })
})

describe('social calendar helpers', () => {
  it('detects same-day conflicts', () => {
    const conflicts = findCalendarConflicts([
      { id: '1', title: 'A', scheduled_at: '2026-07-27T10:00:00.000Z' },
      { id: '2', title: 'B', scheduled_at: '2026-07-27T18:00:00.000Z' },
      { id: '3', title: 'C', scheduled_at: '2026-07-28T10:00:00.000Z' },
    ])
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].day).toBe('2026-07-27')
    expect(conflicts[0].postIds).toEqual(['1', '2'])
  })

  it('finds gap days without content', () => {
    const days = [
      new Date('2026-07-27T12:00:00.000Z'),
      new Date('2026-07-28T12:00:00.000Z'),
      new Date('2026-07-29T12:00:00.000Z'),
    ]
    const gaps = findCalendarGaps(days, [
      { id: '1', scheduled_at: '2026-07-28T15:00:00.000Z' },
    ])
    expect(gaps).toEqual(['2026-07-27', '2026-07-29'])
  })

  it('filters posts by platform and campaign', () => {
    const posts = [
      {
        id: '1',
        campaign_id: 'c1',
        social_post_variants: [{ platform: 'instagram' }],
      },
      {
        id: '2',
        campaign_id: 'c2',
        social_post_variants: [{ platform: 'linkedin' }],
      },
    ]
    expect(filterCalendarPosts(posts, { campaignId: 'c1' })).toHaveLength(1)
    expect(filterCalendarPosts(posts, { platform: 'linkedin' })[0].id).toBe('2')
  })
})
