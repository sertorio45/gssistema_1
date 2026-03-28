import { createError, defineEventHandler, getQuery, getRequestURL } from 'h3'

import { resolveMarketingTenantContext } from '~/server/utils/marketing'

function toProvider(value: string) {
  if (value === 'google_ads' || value === 'google_analytics' || value === 'meta')
    return value
  return null
}

export default defineEventHandler(async (event) => {
  const providerParam = event.context.params?.provider || ''
  const provider = toProvider(providerParam)
  if (!provider) {
    throw createError({ statusCode: 400, statusMessage: 'Provider inválido' })
  }

  const query = getQuery(event)
  const { tenantId } = await resolveMarketingTenantContext(event, query.tenant_id as string | undefined)

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
  const state = `${tenantId}:${provider}`

  if (provider === 'meta') {
    const clientId = process.env.META_APP_ID || ''
    if (!clientId) {
      throw createError({ statusCode: 500, statusMessage: 'META_APP_ID não configurado' })
    }
    const scopes = ['ads_read', 'ads_management', 'business_management', 'read_insights'].join(',')
    const url = new URL('https://www.facebook.com/v20.0/dialog/oauth')
    url.searchParams.set('client_id', clientId)
    url.searchParams.set('redirect_uri', callbackUrl)
    url.searchParams.set('state', state)
    url.searchParams.set('scope', scopes)
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
