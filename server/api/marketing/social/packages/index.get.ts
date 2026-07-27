import { getQuery } from 'h3'
import { z } from 'zod'

import { computePackageUsage } from '~/server/utils/social-packages'
import { requireSocialContext } from '~/server/utils/social-context'

const querySchema = z.object({
  status: z.enum(['draft', 'active', 'paused', 'ended', 'all']).optional(),
})

export default defineEventHandler(async (event) => {
  const query = querySchema.parse(getQuery(event))
  const { client, tenantId } = await requireSocialContext(event, 'marketing.social.packages.read')

  let request = client
    .from('social_client_packages')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('starts_at', { ascending: false })

  if (query.status && query.status !== 'all')
    request = request.eq('status', query.status)

  const { data, error } = await request
  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  const rows = []
  for (const pkg of data || []) {
    const usage = await computePackageUsage(client, tenantId, pkg)
    rows.push({ ...pkg, usage })
  }

  return { data: rows }
})
