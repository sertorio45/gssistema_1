import { listEligibleSocialApprovers } from '~/server/utils/social-approvers'
import { requireSocialContext } from '~/server/utils/social-context'

export default defineEventHandler(async (event) => {
  const { client, tenantId } = await requireSocialContext(event, 'marketing.social.create')
  return { data: await listEligibleSocialApprovers(client, tenantId) }
})
