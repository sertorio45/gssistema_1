import { requireSocialContext } from '~/server/utils/social-context'

export default defineEventHandler(async (event) => {
  const { client, tenantId } = await requireSocialContext(event, 'marketing.social.read')
  const statuses = [
    'draft',
    'pending_approval',
    'approved',
    'scheduled',
    'published',
    'failed',
  ] as const

  const counts = await Promise.all(statuses.map(async (status) => {
    const { count } = await client
      .from('social_posts')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', status)
    return [status, count || 0] as const
  }))

  return { data: Object.fromEntries(counts) }
})
