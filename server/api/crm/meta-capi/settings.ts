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

    if (typeof body.pixel_id === 'string') {
      const pixelId = body.pixel_id.trim()
      if (pixelId)
        config.pixel_id = pixelId
      else
        delete config.pixel_id
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
