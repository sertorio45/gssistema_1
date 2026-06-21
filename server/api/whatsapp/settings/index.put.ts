import { serverSupabaseServiceRole } from '#supabase/server'
import { createError, readBody } from 'h3'

import {
  getWhatsAppModuleSettings,
  saveWhatsAppGeneralSettings,
  saveWhatsAppLlmSettings,
} from '~/server/utils/whatsapp/settings-service'
import { getOllamaConfigStatus } from '~/server/utils/whatsapp/ollama-client'
import { resolveWhatsAppTenantContext } from '~/server/utils/whatsapp/context'
import type { WhatsAppGeneralSettings, WhatsAppLlmSettings } from '~/types/whatsapp'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    tenant_id?: string
    general?: Partial<WhatsAppGeneralSettings>
    llm?: Partial<WhatsAppLlmSettings>
  }>(event)

  const { tenantId } = await resolveWhatsAppTenantContext(event, body.tenant_id)
  const client = serverSupabaseServiceRole(event)

  if (body.general)
    await saveWhatsAppGeneralSettings(client, tenantId, body.general)

  if (body.llm)
    await saveWhatsAppLlmSettings(client, tenantId, body.llm)

  const settings = await getWhatsAppModuleSettings(client, tenantId)

  return {
    data: {
      ...settings,
      ollamaConfigured: getOllamaConfigStatus().ready,
    },
  }
})
