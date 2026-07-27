import { serverSupabaseServiceRole } from '#supabase/server'
import { getHeader, getRequestIP, getRouterParam, readBody } from 'h3'
import { z } from 'zod'

import {
  hashIp,
  submitPublicReviewComment,
} from '~/server/utils/social-review-links'

const schema = z.object({
  body: z.string().trim().min(1).max(3000),
  actorEmail: z.string().email().optional(),
  anchorType: z.enum(['none', 'image', 'carousel', 'video']).optional(),
  xPercent: z.number().min(0).max(100).nullable().optional(),
  yPercent: z.number().min(0).max(100).nullable().optional(),
  slideIndex: z.number().int().min(0).nullable().optional(),
  mediaTimeMs: z.number().int().min(0).nullable().optional(),
  assetId: z.string().uuid().nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const token = String(getRouterParam(event, 'token') || '')
  if (!token || token.length < 16)
    throw createError({ statusCode: 404, statusMessage: 'Link inválido ou expirado' })

  const input = schema.parse(await readBody(event) || {})
  const client = await serverSupabaseServiceRole(event)
  const ip = getRequestIP(event, { xForwardedFor: true }) || null
  const userAgent = getHeader(event, 'user-agent') || null

  const data = await submitPublicReviewComment(client, {
    token,
    body: input.body,
    actorEmail: input.actorEmail || null,
    anchor: {
      anchorType: input.anchorType,
      xPercent: input.xPercent,
      yPercent: input.yPercent,
      slideIndex: input.slideIndex,
      mediaTimeMs: input.mediaTimeMs,
      assetId: input.assetId,
    },
    ipHash: hashIp(ip),
    userAgent,
  })

  return { data }
})
