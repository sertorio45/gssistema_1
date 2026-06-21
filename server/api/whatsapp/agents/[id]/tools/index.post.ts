import { serverSupabaseServiceRole } from '#supabase/server'
import { createError, getRouterParam, readBody } from 'h3'

import { mapAgentToolRow } from '~/composables/whatsapp/useWhatsAppMapper'
import { resolveWhatsAppTenantContext } from '~/server/utils/whatsapp/context'
import type { WhatsAppAgentToolType } from '~/types/whatsapp'

interface CreateToolBody {
  tenant_id?: string
  name: string
  type?: WhatsAppAgentToolType
  description?: string
  config?: Record<string, unknown>
  mcp_server?: string
  mcp_tool_name?: string
}

export default defineEventHandler(async (event) => {
  const agentId = getRouterParam(event, 'id')
  if (!agentId)
    throw createError({ statusCode: 400, statusMessage: 'id is required' })

  const body = await readBody<CreateToolBody>(event)
  const { tenantId } = await resolveWhatsAppTenantContext(event, body.tenant_id)

  if (!body.name?.trim())
    throw createError({ statusCode: 400, statusMessage: 'name is required' })

  const client = serverSupabaseServiceRole(event)

  const { data: agent } = await client
    .from('whatsapp_agent')
    .select('id')
    .eq('id', agentId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!agent)
    throw createError({ statusCode: 404, statusMessage: 'Agent not found' })

  const { data, error } = await client
    .from('whatsapp_agent_tool')
    .insert({
      tenant_id: tenantId,
      agent_id: agentId,
      name: body.name.trim(),
      type: body.type || 'api',
      config: {
        ...(body.config || {}),
        description: body.description?.trim() || body.name.trim(),
      },
      mcp_server: body.mcp_server?.trim() || null,
      mcp_tool_name: body.mcp_tool_name?.trim() || null,
      is_enabled: true,
    })
    .select('*')
    .single()

  if (error || !data)
    throw createError({ statusCode: 400, statusMessage: error?.message || 'Failed to create tool' })

  return { data: mapAgentToolRow(data as any) }
})
