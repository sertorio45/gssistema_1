import { getQuery } from 'h3'

import { listAutomationRules } from '~/server/utils/social-automations'
import { requireSocialContext } from '~/server/utils/social-context'

export default defineEventHandler(async (event) => {
  getQuery(event)
  const { client, tenantId } = await requireSocialContext(event, 'marketing.social.automations.read')
  const data = await listAutomationRules(client, tenantId)
  return { data }
})
