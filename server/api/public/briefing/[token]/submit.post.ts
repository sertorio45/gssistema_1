import { getHeader, getRouterParam, readBody } from 'h3'
import { z } from 'zod'

import { submitPublicBriefing } from '~/server/utils/social-briefing-links'
import { serverSupabaseServiceRole } from '#supabase/server'

const bodySchema = z.object({
  email: z.string().email().optional().nullable(),
  payload: z.record(z.unknown()),
})

export default defineEventHandler(async (event) => {
  const token = String(getRouterParam(event, 'token') || '')
  const body = bodySchema.parse(await readBody(event))
  if (!token)
    throw createError({ statusCode: 404, statusMessage: 'Link inválido' })

  const client = await serverSupabaseServiceRole(event)
  const result = await submitPublicBriefing(client, {
    token,
    payload: body.payload,
    email: body.email,
    ip: getHeader(event, 'x-forwarded-for') || getHeader(event, 'x-real-ip'),
    userAgent: getHeader(event, 'user-agent'),
  })

  return { data: result }
})
