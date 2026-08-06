import { getQuery } from 'h3'
import { z } from 'zod'

import { requireSocialContext } from '~/server/utils/social-context'
import { listPostSchedules } from '~/server/utils/marketing-schedules'

const querySchema = z.object({
  postId: z.string().uuid(),
})

export default defineEventHandler(async (event) => {
  const query = querySchema.parse(getQuery(event))
  const { client, tenantId } = await requireSocialContext(event, 'marketing.social.read')

  const data = await listPostSchedules(client, tenantId, query.postId)
  return { data }
})
