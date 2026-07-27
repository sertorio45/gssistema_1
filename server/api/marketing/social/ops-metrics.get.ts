import { getQuery } from 'h3'
import { z } from 'zod'

import { computeOpsMetrics } from '~/server/utils/social-packages'
import { requireSocialContext } from '~/server/utils/social-context'

const querySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const query = querySchema.parse(getQuery(event))
  const { client, tenantId } = await requireSocialContext(event, 'marketing.social.ops_metrics.read')

  const to = query.to ? new Date(query.to) : new Date()
  const from = query.from
    ? new Date(query.from)
    : new Date(to.getTime() - 30 * 24 * 3600_000)

  const metrics = await computeOpsMetrics(
    client,
    tenantId,
    from.toISOString(),
    to.toISOString(),
  )

  return { data: metrics }
})
