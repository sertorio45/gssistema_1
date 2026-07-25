import { createError, defineEventHandler, readBody } from 'h3'

import { clearMarketingCampaignCacheForTenant } from '~/server/utils/marketing'
import { recordSocialAudit } from '~/server/utils/social-audit'
import { requireSocialContext } from '~/server/utils/social-context'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const provider = body?.provider as string | undefined
  if (!provider) {
    throw createError({ statusCode: 400, statusMessage: 'provider é obrigatório' })
  }

  const { tenantId, client, user } = await requireSocialContext(
    event,
    'marketing.social.integrations',
    body?.tenant_id,
  )

  const { error } = await client
    .from('marketing_integrations')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('provider', provider)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  await clearMarketingCampaignCacheForTenant(client, tenantId)
  if (provider === 'meta' || provider === 'linkedin') {
    await client
      .from('social_accounts')
      .update({ is_active: false })
      .eq('tenant_id', tenantId)
      .eq('provider', provider)
  }

  await recordSocialAudit(event, client, {
    tenantId,
    actorId: user.id,
    action: 'integration.disconnected',
    entityType: 'marketing_integration',
    after: { provider },
  })

  return { success: true }
})
