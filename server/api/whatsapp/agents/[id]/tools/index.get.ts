import { serverSupabaseServiceRole } from '#supabase/server'
import { createError, getQuery, getRouterParam } from 'h3'

import { mapAgentToolRow, mapAgentRow } from '~/composables/whatsapp/useWhatsAppMapper'
import { getInternalToolDefinitions } from '~/server/utils/whatsapp/agent-tools'
import { resolveWhatsAppTenantContext } from '~/server/utils/whatsapp/context'

export default defineEventHandler(async (event) => {
  const agentId = getRouterParam(event, 'id')
  if (!agentId)
    throw createError({ statusCode: 400, statusMessage: 'id is required' })

  const query = getQuery(event)
  const { tenantId } = await resolveWhatsAppTenantContext(event, query.tenant_id as string | undefined)
  const client = serverSupabaseServiceRole(event)

  const { data: agent } = await client
    .from('whatsapp_agent')
    .select('id')
    .eq('id', agentId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!agent)
    throw createError({ statusCode: 404, statusMessage: 'Agent not found' })

  const { data: customTools } = await client
    .from('whatsapp_agent_tool')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('agent_id', agentId)
    .order('name', { ascending: true })

  return {
    data: {
      internal: getInternalToolDefinitions(),
      custom: (customTools || []).map(mapAgentToolRow),
    },
  }
})
