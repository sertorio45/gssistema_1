import type { SupabaseClient } from '@supabase/supabase-js'

import type { DrawflowExport, DrawflowNode } from '~/types/drawflow'
import {
  findDrawflowTriggerNode,
  getCanvasFromViewport,
  getDrawflowConnections,
  getDrawflowNodes,
} from '~/server/utils/whatsapp/flow-canvas'
import { sendWhatsAppTextMessage } from '~/server/utils/whatsapp/message-sender'
import { loadInstanceWithIntegrationByClient } from '~/server/utils/whatsapp/instance-loader'
import { broadcastWhatsAppEvent } from '~/server/utils/whatsapp/realtime-broadcast'

export interface FlowExecutionInput {
  tenantId: string
  instanceId: string
  contactId: string | null
  conversationId: string | null
  remoteJid: string
  messageId: string
  messageContent: string
  messageType: string
  fromMe: boolean
  sentAt?: string | null
  contactPhone: string
  contactName?: string | null
  isTest?: boolean
}

interface RuntimeContext extends FlowExecutionInput {
  variables: Record<string, string>
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function interpolate(template: string, variables: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => variables[key] ?? '')
}

function matchesTriggerNode(node: DrawflowNode, input: FlowExecutionInput): boolean {
  if (input.isTest)
    return true

  const data = node.data || {}
  const onlyIncoming = data.onlyIncoming !== false
  if (onlyIncoming && input.fromMe)
    return false

  const instanceIds = (data.instanceIds || []) as string[]
  if (instanceIds.length && !instanceIds.includes(input.instanceId))
    return false

  const triggerType = String(data.triggerType || 'message_received')
  if (triggerType === 'keyword') {
    const keywords = (data.keywords || []) as string[]
    if (!keywords.length)
      return false
    const content = input.messageContent.toLowerCase()
    return keywords.some(k => content.includes(String(k).toLowerCase()))
  }

  return triggerType === 'message_received'
}

function evaluateCondition(node: DrawflowNode, messageContent: string): boolean {
  const data = node.data || {}
  const operator = String(data.operator || 'contains')
  const value = String(data.value || '').toLowerCase()
  const content = messageContent.toLowerCase()

  if (operator === 'equals')
    return content === value
  if (operator === 'starts_with')
    return content.startsWith(value)
  if (operator === 'not_contains')
    return !content.includes(value)

  return content.includes(value)
}

function buildRuntimeContext(input: FlowExecutionInput): RuntimeContext {
  return {
    ...input,
    variables: {
      phone: input.contactPhone,
      name: input.contactName || '',
      message: input.messageContent,
      conversation_id: input.conversationId || '',
      contact_id: input.contactId || '',
      instance_id: input.instanceId,
    },
  }
}

async function executeNode(
  client: SupabaseClient,
  node: DrawflowNode,
  ctx: RuntimeContext,
  log: (action: string, output: Record<string, unknown>, error?: string) => Promise<void>,
): Promise<string | null> {
  const nodeType = String(node.data?.nodeType || node.name)

  if (nodeType === 'trigger') {
    await log('trigger', { ok: true })
    return 'output_1'
  }

  if (nodeType === 'message') {
    const text = interpolate(String(node.data?.text || ''), ctx.variables).trim()
    if (!text) {
      await log('message', { skipped: true }, 'Empty message text')
      return 'output_1'
    }

    try {
      const { instance, integration } = await loadInstanceWithIntegrationByClient(client, ctx.instanceId)
      const providerResult = await sendWhatsAppTextMessage({
        instance,
        integration,
        phone: ctx.contactPhone,
        remoteJid: ctx.remoteJid,
        text,
      }) as any

      const externalId
        = providerResult?.key?.id
          || providerResult?.messages?.[0]?.id
          || null

      if (!ctx.isTest && ctx.conversationId && ctx.contactId) {
        const now = new Date().toISOString()
        const { data: message } = await client
          .from('whatsapp_message')
          .insert({
            tenant_id: ctx.tenantId,
            conversation_id: ctx.conversationId,
            instance_id: ctx.instanceId,
            contact_id: ctx.contactId,
            external_id: externalId,
            remote_jid: ctx.remoteJid,
            from_me: true,
            message_type: 'text',
            content: text,
            status: 'sent',
            sent_at: now,
            metadata: { source: 'whatsapp_flow' },
          })
          .select('*')
          .single()

        await client
          .from('whatsapp_conversation')
          .update({
            last_message_preview: text.slice(0, 120),
            last_message_at: now,
            updated_at: now,
          })
          .eq('id', ctx.conversationId)

        if (message)
          await broadcastWhatsAppEvent(ctx.tenantId, 'message', message)
      }

      await log('message', { text, externalId, testMode: ctx.isTest === true })
      return 'output_1'
    }
    catch (error: any) {
      const detail
        = error?.data?.response?.message
          || error?.data?.message
          || error?.message
          || 'Send failed'
      await log('message', {}, String(detail))
      return null
    }
  }

  if (nodeType === 'condition') {
    const result = evaluateCondition(node, ctx.messageContent)
    await log('condition', { result })
    return result ? 'output_1' : 'output_2'
  }

  if (nodeType === 'delay') {
    const seconds = Math.min(Math.max(Number(node.data?.seconds || 1), 1), 10)
    await sleep(seconds * 1000)
    await log('delay', { seconds })
    return 'output_1'
  }

  if (nodeType === 'webhook') {
    const url = String(node.data?.url || '').trim()
    if (!url) {
      await log('webhook', { skipped: true }, 'URL not configured')
      return 'output_1'
    }

    try {
      const method = String(node.data?.method || 'POST').toUpperCase()
      const response = await $fetch(url, {
        method: method as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
        body: method === 'GET' ? undefined : {
          tenant_id: ctx.tenantId,
          conversation_id: ctx.conversationId,
          contact: {
            id: ctx.contactId,
            phone: ctx.contactPhone,
            name: ctx.contactName,
          },
          message: {
            id: ctx.messageId,
            content: ctx.messageContent,
            type: ctx.messageType,
          },
        },
      })
      await log('webhook', { response })
      return 'output_1'
    }
    catch (error: any) {
      await log('webhook', {}, error?.message || 'Webhook failed')
      return null
    }
  }

  await log('unknown', { nodeType }, 'Unsupported node type')
  return null
}

async function walkFlow(
  client: SupabaseClient,
  canvas: DrawflowExport,
  startNode: DrawflowNode,
  ctx: RuntimeContext,
  executionId: string,
  tenantId: string,
  visited: Set<number> = new Set(),
): Promise<void> {
  if (visited.has(startNode.id))
    return

  visited.add(startNode.id)

  const log = async (action: string, output: Record<string, unknown>, error?: string) => {
    await client.from('whatsapp_flow_execution_log').insert({
      tenant_id: tenantId,
      execution_id: executionId,
      action,
      input: { node_id: startNode.id, node_type: startNode.data?.nodeType },
      output,
      error: error || null,
    })
  }

  const outputKey = await executeNode(client, startNode, ctx, log)
  if (!outputKey)
    return

  const nodeMap = new Map(getDrawflowNodes(canvas).map(node => [node.id, node]))
  const connections = getDrawflowConnections(startNode, outputKey)

  for (const conn of connections) {
    const nextNode = nodeMap.get(conn.targetNodeId)
    if (nextNode)
      await walkFlow(client, canvas, nextNode, ctx, executionId, tenantId, visited)
  }
}

export async function runWhatsAppFlow(
  client: SupabaseClient,
  flow: {
    id: string
    tenant_id: string
    viewport?: Record<string, unknown> | null
  },
  input: FlowExecutionInput,
) {
  const canvas = getCanvasFromViewport(flow.viewport)
  if (!canvas)
    throw new Error('Flow canvas is empty')

  const triggerNode = findDrawflowTriggerNode(canvas)
  if (!triggerNode)
    throw new Error('Flow has no trigger node')

  if (!matchesTriggerNode(triggerNode, input))
    return { skipped: true, reason: 'Trigger did not match' }

  const ctx = buildRuntimeContext(input)
  const startedAt = new Date().toISOString()

  const { data: execution, error: executionError } = await client
    .from('whatsapp_flow_execution')
    .insert({
      tenant_id: flow.tenant_id,
      flow_id: flow.id,
      contact_id: input.contactId,
      conversation_id: input.conversationId,
      status: 'running',
      context: { input, isTest: input.isTest === true },
      started_at: startedAt,
    })
    .select('id')
    .single()

  if (executionError || !execution)
    throw new Error(executionError?.message || 'Failed to start flow execution')

  try {
    await walkFlow(client, canvas, triggerNode, ctx, execution.id, flow.tenant_id)

    await client
      .from('whatsapp_flow_execution')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', execution.id)

    return { executionId: execution.id, status: 'completed', isTest: input.isTest === true }
  }
  catch (error: any) {
    await client
      .from('whatsapp_flow_execution')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        context: { input, error: error?.message || 'Flow failed', isTest: input.isTest === true },
        updated_at: new Date().toISOString(),
      })
      .eq('id', execution.id)

    throw error
  }
}