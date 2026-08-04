import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

import { createError, defineEventHandler, getQuery, readBody } from 'h3'

import {
  countPendingWonPurchases,
  getMetaCapiSettings,
} from '~/server/utils/crm/meta-capi'
import { encryptSecret } from '~/server/utils/marketing'
import {
  assertScopedTenantAccess,
  assertTenantModuleAccess,
  resolveTenantApiAuth,
} from '~/server/utils/tenant-access'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user)
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const method = event.method
  const client = await serverSupabaseServiceRole(event)
  const { role, tenantId: userTenantId } = resolveTenantApiAuth(user as any, event.context.auth?.tenantId)

  assertTenantModuleAccess(role)

  if (method === 'GET') {
    const query = getQuery(event)
    const tenantId = (query.tenant_id as string) || userTenantId
    if (!tenantId)
      throw createError({ statusCode: 400, statusMessage: 'Tenant ID is required' })
    assertScopedTenantAccess(role, userTenantId, tenantId)

    const settings = await getMetaCapiSettings(client, tenantId)
    const pendingWon = await countPendingWonPurchases(client, tenantId)

    return {
      data: {
        ...settings,
        pending_won_count: pendingWon,
      },
    }
  }

  if (method === 'PUT') {
    const body = await readBody(event)
    const tenantId = body?.tenant_id || userTenantId
    if (!tenantId)
      throw createError({ statusCode: 400, statusMessage: 'Tenant ID is required' })
    assertScopedTenantAccess(role, userTenantId, tenantId)

    const { data: existing } = await client
      .from('marketing_integrations')
      .select('id, config, is_active')
      .eq('tenant_id', tenantId)
      .eq('provider', 'meta')
      .maybeSingle()

    const config: Record<string, unknown> = { ...(existing?.config || {}) }

    if (typeof body.enabled === 'boolean')
      config.capi_enabled = body.enabled

    if (body.setup_mode === 'manual' || body.setup_mode === 'oauth')
      config.capi_setup_mode = body.setup_mode

    if (typeof body.pixel_id === 'string' || typeof body.dataset_id === 'string') {
      const datasetId = String(body.dataset_id ?? body.pixel_id ?? '').trim()
      if (datasetId) {
        config.pixel_id = datasetId
        config.dataset_id = datasetId
      }
      else {
        delete config.pixel_id
        delete config.dataset_id
      }
    }

    if (typeof body.ad_account_id === 'string') {
      const adAccountId = body.ad_account_id.trim().replace(/^act_/i, '')
      if (adAccountId)
        config.ad_account_id = adAccountId
      else
        delete config.ad_account_id
    }

    if (typeof body.business_id === 'string') {
      const businessId = body.business_id.trim()
      if (businessId)
        config.business_id = businessId
      else
        delete config.business_id
    }

    if (typeof body.business_name === 'string') {
      const businessName = body.business_name.trim()
      if (businessName)
        config.business_name = businessName
      else
        delete config.business_name
    }

    if (typeof body.test_event_code === 'string') {
      const code = body.test_event_code.trim()
      if (code)
        config.capi_test_event_code = code
      else
        delete config.capi_test_event_code
    }

    if (typeof body.access_token === 'string') {
      const token = body.access_token.trim()
      if (token)
        config.capi_access_token_enc = encryptSecret(token)
    }

    if (body.clear_token === true)
      delete config.capi_access_token_enc

    const payload = {
      tenant_id: tenantId,
      provider: 'meta',
      is_active: existing?.is_active ?? true,
      config,
      updated_at: new Date().toISOString(),
    }

    const { error } = await client
      .from('marketing_integrations')
      .upsert(payload, { onConflict: 'tenant_id,provider' })

    if (error)
      throw createError({ statusCode: 500, statusMessage: error.message })

    const settings = await getMetaCapiSettings(client, tenantId)
    const pendingWon = await countPendingWonPurchases(client, tenantId)

    return {
      data: {
        ...settings,
        pending_won_count: pendingWon,
      },
    }
  }

  throw createError({ statusCode: 405, statusMessage: 'Method not allowed' })
})
