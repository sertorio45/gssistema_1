import { defineEventHandler, getRequestURL, sendRedirect } from 'h3'

/** Legacy Meta App entry — forwards to the module-neutral OAuth callback. */
export default defineEventHandler(async (event) => {
  const requestUrl = getRequestURL(event)
  const query = requestUrl.search || ''
  return sendRedirect(event, `/api/oauth/meta/callback${query}`, 302)
})
