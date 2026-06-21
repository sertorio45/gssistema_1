import { createError } from 'h3'

import { loadInstanceWithIntegration } from '~/server/utils/whatsapp/instance-loader'

export default defineEventHandler(async (event) => {
  const instanceId = getRouterParam(event, 'instanceId')
  if (!instanceId)
    throw createError({ statusCode: 400, statusMessage: 'instanceId is required' })

  await loadInstanceWithIntegration(event, instanceId)

  return {
    ok: true,
    provider: 'evolution',
    instanceId,
    message: 'Webhook ativo. Envie eventos via POST.',
  }
})
