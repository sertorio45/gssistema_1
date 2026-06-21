import { serverSupabaseServiceRole } from '#supabase/server'
import { createError, getHeader, getQuery } from 'h3'

import { processWaitingFlowExecutions } from '~/server/utils/whatsapp/flow-runner'

export default defineEventHandler(async (event) => {
  const secret = process.env.API_SECRET
  const headerSecret = getHeader(event, 'x-api-secret') || getQuery(event).secret

  if (secret && headerSecret !== secret) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const client = serverSupabaseServiceRole(event)
  const limit = Math.min(Number(getQuery(event).limit) || 20, 100)
  const result = await processWaitingFlowExecutions(client, limit)

  return { ok: true, ...result }
})
