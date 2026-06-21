import { serverSupabaseServiceRole } from '#supabase/server'
import { createError, readBody } from 'h3'

import { mapAgentRow } from '~/composables/whatsapp/useWhatsAppMapper'
import { resolveWhatsAppTenantContext } from '~/server/utils/whatsapp/context'

interface CreateAgentBody {
  tenant_id?: string
  name: string
  description?: string
  llm_provider?: 'ollama' | 'openai'
  model?: string
  system_prompt?: string
  temperature?: number
  max_tokens?: number
  is_active?: boolean
}

export default defineEventHandler(async (event) => {
  const body = await readBody<CreateAgentBody>(event)
  const { tenantId } = await resolveWhatsAppTenantContext(event, body.tenant_id)

  if (!body.name?.trim())
    throw createError({ statusCode: 400, statusMessage: 'name is required' })

  const client = serverSupabaseServiceRole(event)

  const { data, error } = await client
    .from('whatsapp_agent')
    .insert({
      tenant_id: tenantId,
      name: body.name.trim(),
      description: body.description?.trim() || null,
      llm_provider: body.llm_provider || 'ollama',
      model: body.model?.trim() || 'qwen',
      system_prompt: body.system_prompt?.trim() || 'Você é um assistente de atendimento prestativo.',
      temperature: body.temperature ?? 0.7,
      max_tokens: body.max_tokens ?? 1024,
      is_active: body.is_active ?? true,
    })
    .select('*')
    .single()

  if (error || !data)
    throw createError({ statusCode: 400, statusMessage: error?.message || 'Failed to create agent' })

  return { data: mapAgentRow(data as any) }
})
