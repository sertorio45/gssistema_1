import { createError, readBody } from 'h3'

import { serverSupabaseServiceRole } from '#supabase/server'

import { mapMessageRow } from '~/composables/whatsapp/useWhatsAppMapper'
import { resolveWhatsAppTenantContext } from '~/server/utils/whatsapp/context'
import { loadInstanceWithIntegration } from '~/server/utils/whatsapp/instance-loader'
import { sendWhatsAppTextMessage } from '~/server/utils/whatsapp/message-sender'
import { broadcastWhatsAppEvent } from '~/server/utils/whatsapp/realtime-broadcast'

interface SendMessageBody {
  tenant_id?: string
  conversation_id: string
  content: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<SendMessageBody>(event)
  const { tenantId } = await resolveWhatsAppTenantContext(event, body.tenant_id)

  if (!body.conversation_id)
    throw createError({ statusCode: 400, statusMessage: 'conversation_id is required' })

  const text = body.content?.trim()
  if (!text)
    throw createError({ statusCode: 400, statusMessage: 'content is required' })

  const client = serverSupabaseServiceRole(event)

  const { data: conversation, error: convError } = await client
    .from('whatsapp_conversation')
    .select('*')
    .eq('id', body.conversation_id)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (convError || !conversation)
    throw createError({ statusCode: 404, statusMessage: 'Conversation not found' })

  if (!conversation.instance_id) {
    const { data: instances } = await client
      .from('whatsapp_instance')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('status', 'connected')
      .order('is_default', { ascending: false })
      .limit(1)

    const fallbackInstance = instances?.[0]
    if (!fallbackInstance?.id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Nenhuma instância WhatsApp conectada',
      })
    }

    conversation.instance_id = fallbackInstance.id
    await client
      .from('whatsapp_conversation')
      .update({ instance_id: fallbackInstance.id })
      .eq('id', conversation.id)
  }

  const { instance, integration } = await loadInstanceWithIntegration(event, conversation.instance_id)

  if (instance.status !== 'connected') {
    throw createError({ statusCode: 400, statusMessage: 'WhatsApp instance is not connected' })
  }

  if (!integration)
    throw createError({ statusCode: 400, statusMessage: 'Integration not configured' })

  const phone = conversation.contact_phone || conversation.remote_jid.replace(/@.*/, '')
  const now = new Date().toISOString()

  let externalId: string | null = null
  try {
    const providerResult = await sendWhatsAppTextMessage({
      instance,
      integration,
      phone,
      text,
    }) as any

    externalId
      = providerResult?.key?.id
        || providerResult?.messages?.[0]?.id
        || null
  }
  catch (error: any) {
    throw createError({
      statusCode: 400,
      statusMessage: error?.data?.message || error?.message || 'Failed to send message',
    })
  }

  const { data: message, error: msgError } = await client
    .from('whatsapp_message')
    .insert({
      tenant_id: tenantId,
      conversation_id: conversation.id,
      instance_id: instance.id,
      contact_id: conversation.contact_id,
      external_id: externalId,
      remote_jid: conversation.remote_jid,
      from_me: true,
      message_type: 'text',
      content: text,
      status: 'sent',
      sent_at: now,
    })
    .select('*')
    .single()

  if (msgError)
    throw createError({ statusCode: 400, statusMessage: msgError.message })

  const { data: updatedConversation } = await client
    .from('whatsapp_conversation')
    .update({
      last_message_preview: text,
      last_message_at: now,
      updated_at: now,
    })
    .eq('id', conversation.id)
    .select('*')
    .single()

  await broadcastWhatsAppEvent(tenantId, 'message', message as any)
  if (updatedConversation)
    await broadcastWhatsAppEvent(tenantId, 'conversation', updatedConversation as any)

  return { data: mapMessageRow(message as any) }
})
