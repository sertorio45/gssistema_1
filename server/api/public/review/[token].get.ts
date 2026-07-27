import { serverSupabaseServiceRole } from '#supabase/server'
import { getHeader, getRequestIP, getRouterParam } from 'h3'

import {
  getPublicReviewPayload,
  hashIp,
} from '~/server/utils/social-review-links'

export default defineEventHandler(async (event) => {
  const token = String(getRouterParam(event, 'token') || '')
  if (!token || token.length < 16)
    throw createError({ statusCode: 404, statusMessage: 'Link inválido ou expirado' })

  const client = await serverSupabaseServiceRole(event)
  const ip = getRequestIP(event, { xForwardedFor: true }) || null
  const userAgent = getHeader(event, 'user-agent') || null

  const data = await getPublicReviewPayload(client, {
    token,
    ipHash: hashIp(ip),
    userAgent,
  })

  return { data }
})
