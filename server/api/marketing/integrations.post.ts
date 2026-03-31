import { serverSupabaseServiceRole } from '#supabase/server'

import { createError, defineEventHandler, readBody } from 'h3'

import { clearMarketingCampaignCacheForTenant, decryptSecret, encryptSecret, resolveMarketingTenantContext } from '~/server/utils/marketing'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  if (!body?.provider || !body?.config) {
    throw createError({ statusCode: 400, statusMessage: 'provider and config are required' })
  }

  const { tenantId } = await resolveMarketingTenantContext(event, body.tenant_id)
  const client = await serverSupabaseServiceRole(event)

  const provider = body.provider as 'google_ads' | 'google_analytics' | 'meta'
  const incomingConfig = { ...(body.config || {}) }
  if ('page_access_token' in incomingConfig)
    delete (incomingConfig as any).page_access_token

  const { data: existingIntegration } = await client
    .from('marketing_integrations')
    .select('config')
    .eq('tenant_id', tenantId)
    .eq('provider', provider)
    .maybeSingle()

  const config: Record<string, any> = { ...(existingIntegration?.config || {}), ...incomingConfig }

  if (provider === 'meta') {
    const optionalMetaKeys = ['ad_account_id', 'page_id', 'pixel_id', 'instagram_business_account_id'] as const
    for (const k of optionalMetaKeys) {
      if (k in incomingConfig && (incomingConfig[k] === '' || incomingConfig[k] == null))
        delete config[k]
    }
  }

  if (incomingConfig.access_token) {
    config.access_token_enc = encryptSecret(incomingConfig.access_token)
    delete config.access_token
  }
  if (incomingConfig.refresh_token) {
    config.refresh_token_enc = encryptSecret(incomingConfig.refresh_token)
    delete config.refresh_token
  }
  if (incomingConfig.developer_token) {
    config.developer_token_enc = encryptSecret(incomingConfig.developer_token)
    delete config.developer_token
  }
  if (incomingConfig.client_id) {
    config.client_id_enc = encryptSecret(incomingConfig.client_id)
    delete config.client_id
  }
  if (incomingConfig.client_secret) {
    config.client_secret_enc = encryptSecret(incomingConfig.client_secret)
    delete config.client_secret
  }

  if (provider === 'meta' && incomingConfig.page_id !== undefined) {
    const pageId = String(incomingConfig.page_id || '').trim()
    const userToken = decryptSecret(config.access_token_enc)
    if (pageId && userToken) {
      const res = await $fetch<{ data?: Array<{ id?: string, access_token?: string }> }>(
        'https://graph.facebook.com/v20.0/me/accounts',
        {
          query: {
            fields: 'id,access_token',
            access_token: userToken,
          },
        },
      ).catch(() => ({ data: [] }))
      const row = (res.data || []).find(p => String(p.id) === pageId)
      if (row?.access_token)
        config.page_access_token_enc = encryptSecret(row.access_token)
      else
        delete config.page_access_token_enc
    }
    else {
      delete config.page_access_token_enc
    }
  }

  const payload = {
    tenant_id: tenantId,
    provider,
    is_active: body.is_active ?? true,
    config,
  }

  const { data, error } = await client
    .from('marketing_integrations')
    .upsert(payload, { onConflict: 'tenant_id,provider' })
    .select('id, provider, is_active, updated_at')
    .single()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  await clearMarketingCampaignCacheForTenant(client, tenantId)

  return { data }
})
