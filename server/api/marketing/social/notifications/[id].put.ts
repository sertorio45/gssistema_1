import { getRouterParam } from 'h3'

import { requireSocialContext } from '~/server/utils/social-context'

export default defineEventHandler(async (event) => {
  const notificationId = String(getRouterParam(event, 'id'))
  const { client, tenantId, user } = await requireSocialContext(event, 'marketing.social.read')

  const { data, error } = await client
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('tenant_id', tenantId)
    .eq('user_id', user.id)
    .eq('id', notificationId)
    .select('*')
    .maybeSingle()

  if (error || !data)
    throw createError({ statusCode: 404, statusMessage: 'Notificação não encontrada' })

  return { data }
})
