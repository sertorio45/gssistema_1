import type { SupabaseClient } from '@supabase/supabase-js'

import { findDrawflowTriggerNode, getCanvasFromViewport } from '~/server/utils/whatsapp/flow-canvas'
import {
  resumeWaitingFlowOnInboundMessage,
  runWhatsAppFlow,
} from '~/server/utils/whatsapp/flow-runner'

interface DispatchMessageParams {
  tenantId: string
  instanceId: string
  contactId: string
  conversationId: string
  remoteJid: string
  messageId: string
  messageContent: string
  messageType: string
  fromMe: boolean
  sentAt?: string | null
  contactPhone: string
  contactName?: string | null
}

export async function dispatchWhatsAppFlows(
  client: SupabaseClient,
  params: DispatchMessageParams,
) {
  const flowInput = {
    tenantId: params.tenantId,
    instanceId: params.instanceId,
    contactId: params.contactId,
    conversationId: params.conversationId,
    remoteJid: params.remoteJid,
    messageId: params.messageId,
    messageContent: params.messageContent,
    messageType: params.messageType,
    fromMe: params.fromMe,
    sentAt: params.sentAt,
    contactPhone: params.contactPhone,
    contactName: params.contactName,
  }

  const resumed = await resumeWaitingFlowOnInboundMessage(client, flowInput)
  if (resumed.resumed)
    return

  const { data: flows } = await client
    .from('whatsapp_flow')
    .select('id, tenant_id, viewport, status')
    .eq('tenant_id', params.tenantId)
    .eq('status', 'active')

  if (!flows?.length)
    return

  for (const flow of flows) {
    const canvas = getCanvasFromViewport(flow.viewport as Record<string, unknown>)
    if (!canvas || !findDrawflowTriggerNode(canvas))
      continue

    const { data: existingExecution } = await client
      .from('whatsapp_flow_execution')
      .select('id')
      .eq('flow_id', flow.id)
      .eq('tenant_id', params.tenantId)
      .filter('context->input->>messageId', 'eq', params.messageId)
      .maybeSingle()

    if (existingExecution)
      continue

    try {
      const result = await runWhatsAppFlow(client, flow, flowInput)

      if (result?.skipped) {
        console.info(`[WhatsApp] Flow ${flow.id} skipped: ${result.reason || 'trigger mismatch'}`)
      }
    }
    catch (error: any) {
      if (error?.skipped)
        continue
      console.error(`[WhatsApp] Flow ${flow.id} execution failed:`, error?.message || error)
    }
  }
}

export async function testFlowExecution(
  client: SupabaseClient,
  tenantId: string,
  flowId: string,
) {
  const { data: flow } = await client
    .from('whatsapp_flow')
    .select('id, tenant_id, viewport, status')
    .eq('id', flowId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!flow)
    throw new Error('Flow not found')

  const { data: instance } = await client
    .from('whatsapp_instance')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('status', 'connected')
    .order('is_default', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!instance?.id)
    throw new Error('Connect a WhatsApp instance to test message nodes')

  return runWhatsAppFlow(client, flow, {
    tenantId,
    instanceId: instance.id,
    contactId: null,
    conversationId: null,
    remoteJid: '5511999999999@s.whatsapp.net',
    messageId: '00000000-0000-0000-0000-000000000003',
    messageContent: 'mensagem de teste',
    messageType: 'text',
    fromMe: false,
    sentAt: new Date().toISOString(),
    contactPhone: '5511999999999',
    contactName: 'Contato Teste',
    isTest: true,
  })
}
