import { getQuery } from 'h3'
import { z } from 'zod'

import { requireSocialContext } from '~/server/utils/social-context'

const querySchema = z.object({
  status: z.enum(['draft', 'active', 'paused', 'completed', 'cancelled', 'all']).optional(),
  search: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const query = querySchema.parse(getQuery(event))
  const { client, tenantId } = await requireSocialContext(event, 'marketing.social.campaigns.read')

  let request = client
    .from('social_campaigns')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (query.status && query.status !== 'all')
    request = request.eq('status', query.status)
  if (query.search)
    request = request.ilike('name', `%${query.search.trim()}%`)

  const { data, error, count } = await request
  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  const campaignIds = (data || []).map((row: any) => row.id)
  const counts = new Map<string, number>()
  if (campaignIds.length) {
    const { data: posts } = await client
      .from('social_posts')
      .select('id, campaign_id')
      .eq('tenant_id', tenantId)
      .in('campaign_id', campaignIds)
      .is('deleted_at', null)
    for (const post of posts || []) {
      const key = String(post.campaign_id)
      counts.set(key, (counts.get(key) || 0) + 1)
    }
  }

  return {
    data: (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      objective: row.objective,
      status: row.status,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      ownerId: row.owner_id,
      briefingSummary: row.briefing_summary,
      postsCount: counts.get(String(row.id)) || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
    total: count || 0,
  }
})
