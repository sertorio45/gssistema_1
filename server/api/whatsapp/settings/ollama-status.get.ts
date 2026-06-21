import { getQuery } from 'h3'

import { getOllamaConfigStatus } from '~/server/utils/whatsapp/ollama-client'
import { resolveWhatsAppTenantContext } from '~/server/utils/whatsapp/context'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  await resolveWhatsAppTenantContext(event, query.tenant_id as string | undefined)

  return { data: getOllamaConfigStatus() }
})
