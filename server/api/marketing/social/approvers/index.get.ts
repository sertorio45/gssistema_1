import { listEligibleSocialApprovers } from '~/server/utils/social-approvers'
import { requireSocialContext } from '~/server/utils/social-context'

export default defineEventHandler(async (event) => {
  const { client, tenantId } = await requireSocialContext(event, 'marketing.social.approval.submit')
  return { data: await listEligibleSocialApprovers(client, tenantId) }
})
