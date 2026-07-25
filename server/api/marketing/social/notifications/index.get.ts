import { getQuery } from 'h3'

import { requireSocialContext } from '~/server/utils/social-context'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const { client, tenantId, user } = await requireSocialContext(event, 'marketing.social.read')

  let request = client
    .from('notifications')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(Math.min(100, Math.max(1, Number(query.limit || 30))))

  if (query.unread === 'true')
    request = request.is('read_at', null)

  const { data, error } = await request
  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  return { data: data || [] }
})
