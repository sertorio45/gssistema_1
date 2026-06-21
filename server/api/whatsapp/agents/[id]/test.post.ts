import { serverSupabaseServiceRole } from '#supabase/server'
import { createError, getRouterParam, readBody } from 'h3'

import { runWhatsAppAgentReply } from '~/server/utils/whatsapp/agent-runner'
import { resolveWhatsAppTenantContext } from '~/server/utils/whatsapp/context'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, statusMessage: 'id is required' })

  const body = await readBody<{ tenant_id?: string, message?: string }>(event)
  const { tenantId } = await resolveWhatsAppTenantContext(event, body.tenant_id)
  const message = body.message?.trim()

  if (!message)
    throw createError({ statusCode: 400, statusMessage: 'message is required' })

  const client = serverSupabaseServiceRole(event)

  const result = await runWhatsAppAgentReply(client, {
    tenantId,
    agentId: id,
    ctx: {
      tenantId,
      messageContent: message,
      contactPhone: '5511999999999',
      contactName: 'Teste',
      conversationId: null,
      contactId: null,
      isTest: true,
    },
  })

  return { data: result }
})
