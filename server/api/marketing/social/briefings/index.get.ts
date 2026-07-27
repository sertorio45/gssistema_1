import { getQuery } from 'h3'
import { z } from 'zod'

import { requireSocialContext } from '~/server/utils/social-context'

const querySchema = z.object({
  status: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const query = querySchema.parse(getQuery(event))
  const { client, tenantId } = await requireSocialContext(event, 'marketing.social.briefing.manage')

  let request = client
    .from('social_briefings')
    .select('id, title, status, client_email, submitted_at, post_id, campaign_id, created_at, needs_info_message')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (query.status && query.status !== 'all')
    request = request.eq('status', query.status)

  const { data, error } = await request
  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  return { data: data || [] }
})
