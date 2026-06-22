import { createError, getQuery } from 'h3'

import { listOllamaModels } from '~/server/utils/whatsapp/ollama-client'
import { resolveWhatsAppTenantContext } from '~/server/utils/whatsapp/context'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  await resolveWhatsAppTenantContext(event, query.tenant_id as string | undefined)

  try {
    const models = await listOllamaModels()
    return { data: models }
  }
  catch (error: any) {
    throw createError({
      statusCode: 502,
      statusMessage: error?.message || 'Falha ao listar modelos do Ollama',
    })
  }
})
