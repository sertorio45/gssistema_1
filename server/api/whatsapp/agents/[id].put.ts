import { serverSupabaseServiceRole } from '#supabase/server'
import { createError, getRouterParam, readBody } from 'h3'

import { mapAgentRow } from '~/composables/whatsapp/useWhatsAppMapper'
import { resolveWhatsAppTenantContext } from '~/server/utils/whatsapp/context'
import type { WhatsAppLlmProvider } from '~/types/whatsapp'

interface UpdateAgentBody {
  tenant_id?: string
  name?: string
  description?: string
  llm_provider?: WhatsAppLlmProvider
  model?: string
  system_prompt?: string
  temperature?: number
  max_tokens?: number
  is_active?: boolean
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, statusMessage: 'id is required' })

  const body = await readBody<UpdateAgentBody>(event)
  const { tenantId } = await resolveWhatsAppTenantContext(event, body.tenant_id)
  const client = serverSupabaseServiceRole(event)

  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.name !== undefined)
    payload.name = body.name.trim()
  if (body.description !== undefined)
    payload.description = body.description?.trim() || null
  if (body.llm_provider !== undefined)
    payload.llm_provider = body.llm_provider
  if (body.model !== undefined)
    payload.model = body.model.trim()
  if (body.system_prompt !== undefined)
    payload.system_prompt = body.system_prompt.trim()
  if (body.temperature !== undefined)
    payload.temperature = body.temperature
  if (body.max_tokens !== undefined)
    payload.max_tokens = body.max_tokens
  if (body.is_active !== undefined)
    payload.is_active = body.is_active

  const { data, error } = await client
    .from('whatsapp_agent')
    .update(payload)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select('*')
    .maybeSingle()

  if (error || !data)
    throw createError({ statusCode: 400, statusMessage: error?.message || 'Failed to update agent' })

  return { data: mapAgentRow(data as any) }
})
