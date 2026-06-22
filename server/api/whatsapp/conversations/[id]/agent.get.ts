import { createError, getQuery } from 'h3'

import { findActiveConversationAgentSession } from '~/server/utils/whatsapp/conversation-agent'
import { resolveWhatsAppTenantContext } from '~/server/utils/whatsapp/context'
import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, statusMessage: 'id is required' })

  const query = getQuery(event)
  const { tenantId } = await resolveWhatsAppTenantContext(event, query.tenant_id as string | undefined)
  const client = serverSupabaseServiceRole(event)

  const session = await findActiveConversationAgentSession(client, tenantId, id)

  return {
    data: {
      enabled: Boolean(session),
      agentId: session?.agentId ?? null,
      agentName: session?.agentName ?? null,
      sessionId: session?.sessionId ?? null,
    },
  }
})
