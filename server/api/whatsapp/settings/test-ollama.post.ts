import { createError, readBody } from 'h3'

import { testOllamaConnection } from '~/server/utils/whatsapp/ollama-client'
import { resolveWhatsAppTenantContext } from '~/server/utils/whatsapp/context'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ tenant_id?: string, model?: string }>(event)
  await resolveWhatsAppTenantContext(event, body.tenant_id)

  try {
    const result = await testOllamaConnection({ model: body.model })
    return { data: result }
  }
  catch (error: any) {
    throw createError({
      statusCode: 502,
      statusMessage: error?.message || 'Falha ao conectar com Ollama',
    })
  }
})
