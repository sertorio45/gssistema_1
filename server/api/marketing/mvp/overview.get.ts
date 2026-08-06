import { requireSocialContext } from '~/server/utils/social-context'
import {
  emptyMarketingMvpOverviewCounts,
  type MarketingMvpOverviewCounts,
} from '~/types/marketing-mvp'

export default defineEventHandler(async (event) => {
  const { client, tenantId } = await requireSocialContext(event, 'marketing.social.read')

  const { data, error } = await (client as any).rpc('marketing_mvp_overview_counts', {
    p_tenant_id: tenantId,
  })

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Não foi possível carregar a visão geral do Marketing.',
    })
  }

  const payload = (data || emptyMarketingMvpOverviewCounts()) as MarketingMvpOverviewCounts
  return { data: payload }
})
