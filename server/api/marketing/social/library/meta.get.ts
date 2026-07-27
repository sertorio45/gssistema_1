import { getQuery } from 'h3'

import { requireSocialContext } from '~/server/utils/social-context'

export default defineEventHandler(async (event) => {
  const { client, tenantId } = await requireSocialContext(event, 'marketing.social.read')
  const query = getQuery(event)
  const type = String(query.type || 'folders')

  if (type === 'tags') {
    const { data, error } = await client
      .from('media_tags')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('name')
    if (error)
      throw createError({ statusCode: 400, statusMessage: error.message })
    return { data: data || [] }
  }

  const { data, error } = await client
    .from('media_folders')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('name')
  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })
  return { data: data || [] }
})
