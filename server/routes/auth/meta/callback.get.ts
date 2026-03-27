import { defineEventHandler, getRequestURL, sendRedirect } from 'h3'

export default defineEventHandler(async (event) => {
  const requestUrl = getRequestURL(event)
  const query = requestUrl.search || ''
  return sendRedirect(event, `/api/dashboard/oauth/meta/callback${query}`, 302)
})
