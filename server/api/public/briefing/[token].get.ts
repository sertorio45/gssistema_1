import { getHeader, getRouterParam } from 'h3'

import { getPublicBriefingPayload } from '~/server/utils/social-briefing-links'
import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const token = String(getRouterParam(event, 'token') || '')
  if (!token)
    throw createError({ statusCode: 404, statusMessage: 'Link inválido' })

  const client = await serverSupabaseServiceRole(event)
  const data = await getPublicBriefingPayload(client, {
    token,
    ip: getHeader(event, 'x-forwarded-for') || getHeader(event, 'x-real-ip'),
    userAgent: getHeader(event, 'user-agent'),
  })

  return { data }
})
