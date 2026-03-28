import { serverSupabaseServiceRole } from '#supabase/server'

import { createError, defineEventHandler, getQuery } from 'h3'

import { decryptSecret, resolveMarketingTenantContext } from '~/server/utils/marketing'
import { fetchMetaAdCreatives, META_MARKETING_API_VERSION } from '~/server/utils/meta-creatives'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const { tenantId } = await resolveMarketingTenantContext(event, query.tenant_id as string | undefined)
  const client = await serverSupabaseServiceRole(event)

  const { data: integrations, error } = await client
    .from('marketing_integrations')
    .select('provider, config, is_active')
    .eq('tenant_id', tenantId)
    .eq('provider', 'meta')
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  const config = integrations?.config as Record<string, any> | undefined
  const accessToken = config ? decryptSecret(config.access_token_enc) : null
  const adAccountId = config?.ad_account_id != null ? String(config.ad_account_id).replace(/^act_/, '') : ''

  if (!accessToken || !adAccountId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Meta Ads integration not configured for this tenant',
    })
  }

  const activeOnly = query.active_only !== 'false' && query.ads_active_only !== 'false'

  const data = await fetchMetaAdCreatives(accessToken, adAccountId, {
    activeOnly,
  })

  return {
    data,
    api_version: META_MARKETING_API_VERSION,
  }
})
