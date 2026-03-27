import { serverSupabaseServiceRole } from '#supabase/server'

import { createError, defineEventHandler, getQuery, getRequestURL, sendRedirect } from 'h3'

import { clearDashboardCampaignCacheForTenant, encryptSecret } from '~/server/utils/dashboard'

function toProvider(value: string) {
  if (value === 'google_ads' || value === 'google_analytics' || value === 'meta')
    return value
  return null
}

export default defineEventHandler(async (event) => {
  const failRedirect = (message: string) => sendRedirect(event, `/dashboard/integrations?oauth=error&message=${encodeURIComponent(message)}`, 302)
  const providerParam = event.context.params?.provider || ''
  const provider = toProvider(providerParam)
  if (!provider)
    throw createError({ statusCode: 400, statusMessage: 'Provider inválido' })

  const query = getQuery(event)
  const code = String(query.code || '')
  const state = String(query.state || '')
  if (!code || !state)
    throw createError({ statusCode: 400, statusMessage: 'Código OAuth inválido' })

  let [tenantId] = state.split(':')
  if (!tenantId)
    throw createError({ statusCode: 400, statusMessage: 'State OAuth inválido' })

  const client = await serverSupabaseServiceRole(event)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tenantId)) {
    const { data: tenantBySlug } = await client
      .from('tenant')
      .select('id')
      .eq('slug', tenantId)
      .maybeSingle()
    if (tenantBySlug?.id) {
      tenantId = tenantBySlug.id
    }
  }

  const requestUrl = getRequestURL(event)
  const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`
  const googleRedirectUri
    = process.env.GOOGLE_REDIRECT_URI
      || process.env.GOOGLE_OAUTH_REDIRECT_URI
      || `${baseUrl}/auth/google/callback`
  const metaRedirectUri
    = process.env.META_REDIRECT_URI
      || process.env.META_OAUTH_REDIRECT_URI
      || `${baseUrl}/auth/meta/callback`
  const callbackUrl = provider === 'meta' ? metaRedirectUri : googleRedirectUri

  let accessToken = ''
  let refreshToken = ''

  if (provider === 'meta') {
    if (!process.env.META_APP_ID || !process.env.META_APP_SECRET) {
      throw createError({ statusCode: 500, statusMessage: 'META_APP_ID/META_APP_SECRET não configurados' })
    }
    const tokenResponse = await $fetch<any>('https://graph.facebook.com/v20.0/oauth/access_token', {
      query: {
        client_id: process.env.META_APP_ID,
        client_secret: process.env.META_APP_SECRET,
        redirect_uri: callbackUrl,
        code,
      },
    }).catch(() => null)
    if (!tokenResponse?.access_token) {
      return failRedirect('Falha ao obter token Meta. Verifique redirect URI e permissões do app.')
    }
    const shortLivedToken = tokenResponse?.access_token || ''
    if (!shortLivedToken) {
      throw createError({ statusCode: 400, statusMessage: 'Não foi possível obter token Meta' })
    }
    const longLivedResponse = await $fetch<any>('https://graph.facebook.com/v20.0/oauth/access_token', {
      query: {
        grant_type: 'fb_exchange_token',
        client_id: process.env.META_APP_ID,
        client_secret: process.env.META_APP_SECRET,
        fb_exchange_token: shortLivedToken,
      },
    }).catch(() => null)
    accessToken = longLivedResponse?.access_token || shortLivedToken
  }
  else {
    const googleClientId = process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID || ''
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_OAUTH_CLIENT_SECRET || ''
    if (!googleClientId || !googleClientSecret) {
      throw createError({ statusCode: 500, statusMessage: 'GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET não configurados' })
    }
    const tokenResponse = await $fetch<any>('https://oauth2.googleapis.com/token', {
      method: 'POST',
      body: new URLSearchParams({
        code,
        client_id: googleClientId,
        client_secret: googleClientSecret,
        redirect_uri: callbackUrl,
        grant_type: 'authorization_code',
      }),
    }).catch(() => null)
    if (!tokenResponse?.access_token) {
      return failRedirect('Falha ao obter token Google. Verifique redirect URI e credenciais.')
    }
    accessToken = tokenResponse?.access_token || ''
    refreshToken = tokenResponse?.refresh_token || ''
  }

  if (!accessToken)
    throw createError({ statusCode: 400, statusMessage: 'Não foi possível obter access token' })

  const config: Record<string, any> = {
    access_token_enc: encryptSecret(accessToken),
  }
  if (refreshToken) {
    config.refresh_token_enc = encryptSecret(refreshToken)
  }

  const { data: existing } = await client
    .from('dashboard_integrations')
    .select('config')
    .eq('tenant_id', tenantId)
    .eq('provider', provider)
    .maybeSingle()

  const mergedConfig = { ...(existing?.config || {}), ...config }

  const { error } = await client
    .from('dashboard_integrations')
    .upsert(
      {
        tenant_id: tenantId,
        provider,
        is_active: true,
        config: mergedConfig,
      },
      { onConflict: 'tenant_id,provider' },
    )

  if (error)
    throw createError({ statusCode: 500, statusMessage: error.message })

  await clearDashboardCampaignCacheForTenant(client, tenantId)

  return sendRedirect(event, '/dashboard/integrations?oauth=success&provider=' + provider, 302)
})
