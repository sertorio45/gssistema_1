import { defineEventHandler, getRequestURL, sendRedirect } from 'h3'

export default defineEventHandler(async (event) => {
  const requestUrl = getRequestURL(event)
  const state = requestUrl.searchParams.get('state') || ''
  const providerFromState = state.split(':')[1]
  const provider = providerFromState === 'google_ads' ? 'google_ads' : 'google_analytics'
  const query = requestUrl.search || ''
  return sendRedirect(event, `/api/dashboard/oauth/${provider}/callback${query}`, 302)
})
