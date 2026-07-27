import { getQuery } from 'h3'
import { z } from 'zod'

import { requireSocialContext } from '~/server/utils/social-context'

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

export default defineEventHandler(async (event) => {
  const query = querySchema.parse(getQuery(event))
  const { client, tenantId } = await requireSocialContext(event, 'marketing.social.automations.read')

  const { data, error } = await client
    .from('social_automation_runs')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(query.limit || 40)

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  return { data: data || [] }
})
