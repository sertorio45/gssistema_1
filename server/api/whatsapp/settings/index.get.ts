import { serverSupabaseServiceRole } from '#supabase/server'
import { getQuery } from 'h3'

import { getOllamaConfigStatus } from '~/server/utils/whatsapp/ollama-client'
import { getWhatsAppModuleSettings } from '~/server/utils/whatsapp/settings-service'
import { resolveWhatsAppTenantContext } from '~/server/utils/whatsapp/context'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const { tenantId } = await resolveWhatsAppTenantContext(event, query.tenant_id as string | undefined)
  const client = serverSupabaseServiceRole(event)
  const settings = await getWhatsAppModuleSettings(client, tenantId)

  return {
    data: {
      ...settings,
      ollamaConfigured: getOllamaConfigStatus().ready,
    },
  }
})
