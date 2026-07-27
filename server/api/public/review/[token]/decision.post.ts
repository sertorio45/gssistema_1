import { serverSupabaseServiceRole } from '#supabase/server'
import { getHeader, getRequestIP, getRouterParam, readBody } from 'h3'
import { z } from 'zod'

import {
  hashIp,
  submitPublicReviewDecision,
} from '~/server/utils/social-review-links'

const schema = z.object({
  decision: z.enum(['approved', 'changes_requested', 'rejected']),
  comment: z.string().trim().max(2000).nullable().optional(),
  changeCategory: z.enum(['art', 'copy', 'date', 'platform', 'incorrect_info', 'other']).nullable().optional(),
  actorEmail: z.string().email().optional(),
})

export default defineEventHandler(async (event) => {
  const token = String(getRouterParam(event, 'token') || '')
  if (!token || token.length < 16)
    throw createError({ statusCode: 404, statusMessage: 'Link inválido ou expirado' })

  const input = schema.parse(await readBody(event) || {})

  if ((input.decision === 'changes_requested' || input.decision === 'rejected') && !input.comment?.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Descreva o motivo da solicitação ou rejeição',
    })
  }

  const client = await serverSupabaseServiceRole(event)
  const ip = getRequestIP(event, { xForwardedFor: true }) || null
  const userAgent = getHeader(event, 'user-agent') || null

  const result = await submitPublicReviewDecision(client, {
    token,
    decision: input.decision,
    comment: input.comment,
    changeCategory: input.changeCategory,
    actorEmail: input.actorEmail || null,
    ipHash: hashIp(ip),
    userAgent,
  })

  return { data: result }
})
