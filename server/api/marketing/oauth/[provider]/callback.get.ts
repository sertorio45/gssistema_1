import { createHash } from 'node:crypto'
import process from 'node:process'

import { serverSupabaseServiceRole } from '#supabase/server'

import { createError, defineEventHandler, getQuery, getRequestURL, sendRedirect } from 'h3'

import { clearMarketingCampaignCacheForTenant, encryptSecret } from '~/server/utils/marketing'
import { recordSocialAudit } from '~/server/utils/social-audit'

function toProvider(value: string) {
  if (value === 'google_ads' || value === 'google_analytics' || value === 'meta' || value === 'linkedin')
    return value
  return null
}

export default defineEventHandler(async (event) => {
  const failRedirect = (message: string) => sendRedirect(event, `/settings/integrations?oauth=error&message=${encodeURIComponent(message)}`, 302)
  const providerParam = event.context.params?.provider || ''
  const provider = toProvider(providerParam)
  if (!provider)
    throw createError({ statusCode: 400, statusMessage: 'Provider inválido' })

  const query = getQuery(event)
  const code = String(query.code || '')
  const state = String(query.state || '')
  if (!code || !state)
    throw createError({ statusCode: 400, statusMessage: 'Código OAuth inválido' })

  const client: any = await serverSupabaseServiceRole(event)
  const stateHash = createHash('sha256').update(state).digest('hex')
  const { data: oauthState } = await client
    .from('oauth_states')
    .select('id, tenant_id, user_id, provider, redirect_path, expires_at, consumed_at')
    .eq('state_hash', stateHash)
    .eq('provider', provider)
    .maybeSingle()

  if (
    !oauthState
    || oauthState.consumed_at
    || new Date(oauthState.expires_at).getTime() < Date.now()
  ) {
    return failRedirect('A sessão de autenticação expirou. Tente conectar novamente.')
  }

  const tenantId = String(oauthState.tenant_id)
  await client
    .from('oauth_states')
    .update({ consumed_at: new Date().toISOString() })
    .eq('id', oauthState.id)

  const requestUrl = getRequestURL(event)
  const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`
  const googleRedirectUri
    = process.env.GOOGLE_REDIRECT_URI
      || process.env.GOOGLE_OAUTH_REDIRECT_URI
      || `${baseUrl}/api/marketing/oauth/${provider}/callback`
  const metaRedirectUri
    = process.env.META_REDIRECT_URI
      || process.env.META_OAUTH_REDIRECT_URI
      || `${baseUrl}/api/marketing/oauth/meta/callback`
  const linkedinRedirectUri
    = process.env.LINKEDIN_REDIRECT_URI
      || `${baseUrl}/api/marketing/oauth/linkedin/callback`
  const callbackUrl = provider === 'meta'
    ? metaRedirectUri
    : provider === 'linkedin'
      ? linkedinRedirectUri
      : googleRedirectUri

  let accessToken = ''
  let refreshToken = ''
  let expiresIn: number | null = null
  let grantedScopes: string[] = []
  let missingPublishScopes: string[] = []

  if (provider === 'meta') {
    if (!process.env.META_APP_ID || !process.env.META_APP_SECRET) {
      throw createError({ statusCode: 500, statusMessage: 'META_APP_ID/META_APP_SECRET não configurados' })
    }
    const graphVersion = process.env.META_GRAPH_VERSION || 'v20.0'
    const tokenResponse = await $fetch<any>(`https://graph.facebook.com/${graphVersion}/oauth/access_token`, {
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
    const longLivedResponse = await $fetch<any>(`https://graph.facebook.com/${graphVersion}/oauth/access_token`, {
      query: {
        grant_type: 'fb_exchange_token',
        client_id: process.env.META_APP_ID,
        client_secret: process.env.META_APP_SECRET,
        fb_exchange_token: shortLivedToken,
      },
    }).catch(() => null)
    accessToken = longLivedResponse?.access_token || shortLivedToken
    expiresIn = Number(longLivedResponse?.expires_in || tokenResponse?.expires_in || 0) || null

    const appToken = `${process.env.META_APP_ID}|${process.env.META_APP_SECRET}`
    const debug = await $fetch<any>(`https://graph.facebook.com/${graphVersion}/debug_token`, {
      query: {
        input_token: accessToken,
        access_token: appToken,
      },
    }).catch(() => null)
    grantedScopes = (debug?.data?.scopes || []) as string[]
    const requiredPublishScopes = [
      'pages_manage_posts',
      'pages_show_list',
      'instagram_basic',
      'instagram_content_publish',
    ]
    missingPublishScopes = requiredPublishScopes.filter(scope => !grantedScopes.includes(scope))
  }
  else if (provider === 'linkedin') {
    const clientId = process.env.LINKEDIN_CLIENT_ID || ''
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET || ''
    if (!clientId || !clientSecret)
      throw createError({ statusCode: 500, statusMessage: 'Credenciais LinkedIn não configuradas' })

    const tokenResponse = await $fetch<any>('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callbackUrl,
      }),
    }).catch(() => null)

    if (!tokenResponse?.access_token)
      return failRedirect('Falha ao obter token LinkedIn. Verifique o acesso ao Community Management API.')

    accessToken = tokenResponse.access_token
    refreshToken = tokenResponse.refresh_token || ''
    expiresIn = Number(tokenResponse.expires_in || 0) || null
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
    expiresIn = Number(tokenResponse?.expires_in || 0) || null
  }

  if (!accessToken)
    throw createError({ statusCode: 400, statusMessage: 'Não foi possível obter access token' })

  const config: Record<string, any> = {
    access_token_enc: encryptSecret(accessToken),
    connected_by: oauthState.user_id,
  }
  if (refreshToken) {
    config.refresh_token_enc = encryptSecret(refreshToken)
  }
  if (expiresIn)
    config.token_expires_at = new Date(Date.now() + expiresIn * 1000).toISOString()
  if (provider === 'meta') {
    config.granted_scopes = grantedScopes
    if (missingPublishScopes.length)
      config.missing_publish_scopes = missingPublishScopes
    else
      delete config.missing_publish_scopes
    // Page token must be refreshed after reconnecting.
    delete config.page_access_token_enc
  }

  const { data: existing } = await client
    .from('marketing_integrations')
    .select('config')
    .eq('tenant_id', tenantId)
    .eq('provider', provider)
    .maybeSingle()

  const mergedConfig = { ...(existing?.config || {}), ...config }
  if (provider === 'meta' && !missingPublishScopes.length)
    delete mergedConfig.missing_publish_scopes

  const { error } = await client
    .from('marketing_integrations')
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

  await clearMarketingCampaignCacheForTenant(client, tenantId)

  await recordSocialAudit(event, client, {
    tenantId,
    actorId: oauthState.user_id,
    action: 'integration.connected',
    entityType: 'marketing_integration',
    after: {
      provider,
      grantedScopes: provider === 'meta' ? grantedScopes : undefined,
      missingPublishScopes: provider === 'meta' ? missingPublishScopes : undefined,
    },
  })

  const redirectBase = oauthState.redirect_path || '/settings/integrations'
  if (provider === 'meta' && missingPublishScopes.length) {
    const message = `Conectado, mas faltam permissões de publicação: ${missingPublishScopes.join(', ')}. Reconecte e aceite todas as permissões, ou solicite Advanced Access no app Meta.`
    return sendRedirect(event, `${redirectBase}?oauth=error&provider=meta&message=${encodeURIComponent(message)}`, 302)
  }

  return sendRedirect(event, `${redirectBase}?oauth=success&provider=${provider}`, 302)
})
