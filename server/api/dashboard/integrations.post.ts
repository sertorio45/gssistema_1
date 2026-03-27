import { serverSupabaseServiceRole } from '#supabase/server'

import { createError, defineEventHandler, readBody } from 'h3'

import { clearDashboardCampaignCacheForTenant, encryptSecret, resolveDashboardTenantContext } from '~/server/utils/dashboard'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  if (!body?.provider || !body?.config) {
    throw createError({ statusCode: 400, statusMessage: 'provider and config are required' })
  }

  const { tenantId } = await resolveDashboardTenantContext(event, body.tenant_id)
  const client = await serverSupabaseServiceRole(event)

  const provider = body.provider as 'google_ads' | 'google_analytics' | 'meta'
  const incomingConfig = body.config || {}

  const { data: existingIntegration } = await client
    .from('dashboard_integrations')
    .select('config')
    .eq('tenant_id', tenantId)
    .eq('provider', provider)
    .maybeSingle()

  const config: Record<string, any> = { ...(existingIntegration?.config || {}), ...incomingConfig }

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

  const payload = {
    tenant_id: tenantId,
    provider,
    is_active: body.is_active ?? true,
    config,
  }

  const { data, error } = await client
    .from('dashboard_integrations')
    .upsert(payload, { onConflict: 'tenant_id,provider' })
    .select('id, provider, is_active, updated_at')
    .single()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  await clearDashboardCampaignCacheForTenant(client, tenantId)

  return { data }
})
