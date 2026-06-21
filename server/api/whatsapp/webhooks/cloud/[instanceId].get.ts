import { createError, getQuery } from 'h3'

import { loadInstanceWithIntegration } from '~/server/utils/whatsapp/instance-loader'

export default defineEventHandler(async (event) => {
  const instanceId = getRouterParam(event, 'instanceId')
  if (!instanceId)
    throw createError({ statusCode: 400, statusMessage: 'instanceId is required' })

  const query = getQuery(event)
  const { integration } = await loadInstanceWithIntegration(event, instanceId)

  if (query['hub.mode'] === 'subscribe' && query['hub.verify_token']) {
    const verifyToken = integration?.webhook_secret
    if (verifyToken && query['hub.verify_token'] === verifyToken)
      return query['hub.challenge']
    throw createError({ statusCode: 403, statusMessage: 'Invalid verify token' })
  }

  return { ok: true }
})
