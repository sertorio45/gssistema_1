import { serverSupabaseServiceRole } from '#supabase/server'
import { createError, getQuery, getRouterParam } from 'h3'

import { resolveWhatsAppTenantContext } from '~/server/utils/whatsapp/context'

export default defineEventHandler(async (event) => {
  const agentId = getRouterParam(event, 'id')
  const toolId = getRouterParam(event, 'toolId')

  if (!agentId || !toolId)
    throw createError({ statusCode: 400, statusMessage: 'id is required' })

  const query = getQuery(event)
  const { tenantId } = await resolveWhatsAppTenantContext(event, query.tenant_id as string | undefined)
  const client = serverSupabaseServiceRole(event)

  const { error } = await client
    .from('whatsapp_agent_tool')
    .delete()
    .eq('id', toolId)
    .eq('agent_id', agentId)
    .eq('tenant_id', tenantId)

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  return { ok: true }
})
