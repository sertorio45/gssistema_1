import { createHash, randomBytes } from 'node:crypto'
import process from 'node:process'

import { createError, defineEventHandler, getRequestURL } from 'h3'

import { requireSocialContext } from '~/server/utils/social-context'

function toProvider(value: string) {
  if (value === 'google_ads' || value === 'google_analytics' || value === 'meta' || value === 'linkedin')
    return value
  return null
}

export default defineEventHandler(async (event) => {
  const providerParam = event.context.params?.provider || ''
  const provider = toProvider(providerParam)
  if (!provider) {
    throw createError({ statusCode: 400, statusMessage: 'Provider inválido' })
  }

  const { tenantId, user, client } = await requireSocialContext(
    event,
    'marketing.social.integrations',
  )

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
  const state = randomBytes(32).toString('base64url')
  const stateHash = createHash('sha256').update(state).digest('hex')

  const { error: stateError } = await client.from('oauth_states').insert({
    tenant_id: tenantId,
    user_id: user.id,
    provider,
    state_hash: stateHash,
    redirect_path: '/marketing/integrations',
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  })

  if (stateError)
    throw createError({ statusCode: 500, statusMessage: 'Não foi possível iniciar a autenticação' })

  if (provider === 'meta') {
    const clientId = process.env.META_APP_ID || ''
    if (!clientId) {
      throw createError({ statusCode: 500, statusMessage: 'META_APP_ID não configurado' })
    }
    const scopes = [
      'ads_read',
      'ads_management',
      'business_management',
      'read_insights',
      'pages_show_list',
      'pages_read_engagement',
      'pages_manage_posts',
      'instagram_basic',
      'instagram_content_publish',
      'instagram_manage_insights',
    ].join(',')
    const graphVersion = process.env.META_GRAPH_VERSION || 'v20.0'
    const url = new URL(`https://www.facebook.com/${graphVersion}/dialog/oauth`)
    url.searchParams.set('client_id', clientId)
    url.searchParams.set('redirect_uri', callbackUrl)
    url.searchParams.set('state', state)
    url.searchParams.set('scope', scopes)
    return { redirectTo: url.toString() }
  }

  if (provider === 'linkedin') {
    const clientId = process.env.LINKEDIN_CLIENT_ID || ''
    if (!clientId)
      throw createError({ statusCode: 500, statusMessage: 'LINKEDIN_CLIENT_ID não configurado' })

    const url = new URL('https://www.linkedin.com/oauth/v2/authorization')
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('client_id', clientId)
    url.searchParams.set('redirect_uri', callbackUrl)
    url.searchParams.set('state', state)
    url.searchParams.set('scope', 'openid profile w_organization_social rw_organization_admin')
    return { redirectTo: url.toString() }
  }

  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID || ''
  if (!clientId) {
    throw createError({ statusCode: 500, statusMessage: 'GOOGLE_CLIENT_ID não configurado' })
  }
  const scopes
    = provider === 'google_ads'
      ? ['https://www.googleapis.com/auth/adwords']
      : ['https://www.googleapis.com/auth/analytics.readonly']

  const googleUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  googleUrl.searchParams.set('client_id', clientId)
  googleUrl.searchParams.set('redirect_uri', callbackUrl)
  googleUrl.searchParams.set('response_type', 'code')
  googleUrl.searchParams.set('access_type', 'offline')
  googleUrl.searchParams.set('prompt', 'consent')
  googleUrl.searchParams.set('scope', scopes.join(' '))
  googleUrl.searchParams.set('state', state)
  return { redirectTo: googleUrl.toString() }
})
