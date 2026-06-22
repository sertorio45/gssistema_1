import type { SupabaseClient } from '@supabase/supabase-js'

import type { DrawflowExport, DrawflowNode } from '~/types/drawflow'
import {
  findDrawflowTriggerNode,
  getCanvasFromViewport,
  getDrawflowConnections,
  getDrawflowNodes,
} from '~/server/utils/whatsapp/flow-canvas'
import { sendWhatsAppMediaMessage, sendWhatsAppTextMessage } from '~/server/utils/whatsapp/message-sender'
import { runWhatsAppAgentReply } from '~/server/utils/whatsapp/agent-runner'
import { applyFlowAction, applyFlowCrmUpdate, applyFlowHandoff, applyFlowTag, type FlowActionType } from '~/server/utils/whatsapp/flow-actions'
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

export const FLOW_DELAY_SCHEDULE_KEY = '__schedule_delay__'
export const FLOW_WAIT_REPLY_KEY = '__wait_reply__'
const INLINE_DELAY_MAX_SECONDS = 10
const SCHEDULED_DELAY_MAX_SECONDS = 3600

async function persistFlowOutboundMessage(
  client: SupabaseClient,
  ctx: RuntimeContext,
  payload: {
    content: string
    messageType: string
    externalId: string | null
    mediaUrl?: string | null
  },
) {
  if (ctx.isTest || !ctx.conversationId || !ctx.contactId)
    return null

  const now = new Date().toISOString()
  const { data: message } = await client
    .from('whatsapp_message')
    .insert({
      tenant_id: ctx.tenantId,
      conversation_id: ctx.conversationId,
      instance_id: ctx.instanceId,
      contact_id: ctx.contactId,
      external_id: payload.externalId,
      remote_jid: ctx.remoteJid,
      from_me: true,
      message_type: payload.messageType,
      content: payload.content,
      media_url: payload.mediaUrl || null,
      status: 'sent',
      sent_at: now,
      metadata: { source: 'whatsapp_flow' },
    })
    .select('*')
    .single()

  await client
    .from('whatsapp_conversation')
    .update({
      last_message_preview: payload.content.slice(0, 120) || `[${payload.messageType}]`,
      last_message_at: now,
      updated_at: now,
    })
    .eq('id', ctx.conversationId)

  if (message)
    await broadcastWhatsAppEvent(ctx.tenantId, 'message', message)

  return message
}

function extractProviderMessageId(providerResult: any): string | null {
  return providerResult?.key?.id
    || providerResult?.messages?.[0]?.id
    || null
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
  const message = input.messageContent
  return {
    ...input,
    variables: {
      phone: input.contactPhone,
      name: input.contactName || '',
      message,
      last_reply: message,
      conversation_id: input.conversationId || '',
      contact_id: input.contactId || '',
      instance_id: input.instanceId,
    },
  }
}

async function finalizeExecutionAfterWalk(
  client: SupabaseClient,
  executionId: string,
): Promise<'completed' | 'waiting' | 'waiting_reply'> {
  const { data: latestExecution } = await client
    .from('whatsapp_flow_execution')
    .select('status')
    .eq('id', executionId)
    .single()

  const status = latestExecution?.status
  if (status === 'waiting' || status === 'waiting_reply')
    return status

  await client
    .from('whatsapp_flow_execution')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', executionId)

  return 'completed'
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
    const contentType = String(node.data?.contentType || 'text')
    const text = interpolate(String(node.data?.text || node.data?.mediaCaption || ''), ctx.variables).trim()
    const mediaUrl = interpolate(String(node.data?.mediaUrl || ''), ctx.variables).trim()
    const mediaType = String(node.data?.mediaType || 'image') as 'image' | 'video' | 'audio' | 'document'

    if (contentType === 'media' && !mediaUrl) {
      await log('message', { skipped: true }, 'Media URL not configured')
      return 'output_1'
    }

    if (contentType !== 'media' && !text) {
      await log('message', { skipped: true }, 'Empty message text')
      return 'output_1'
    }

    try {
      const { instance, integration } = await loadInstanceWithIntegrationByClient(client, ctx.instanceId)
      let providerResult: any

      if (contentType === 'media') {
        providerResult = await sendWhatsAppMediaMessage({
          instance,
          integration,
          phone: ctx.contactPhone,
          remoteJid: ctx.remoteJid,
          mediatype: mediaType,
          mediaUrl,
          caption: text || undefined,
          fileName: node.data?.fileName ? String(node.data.fileName) : undefined,
        })
      }
      else {
        providerResult = await sendWhatsAppTextMessage({
          instance,
          integration,
          phone: ctx.contactPhone,
          remoteJid: ctx.remoteJid,
          text,
        })
      }

      const externalId = extractProviderMessageId(providerResult)
      await persistFlowOutboundMessage(client, ctx, {
        content: text || `[${mediaType}]`,
        messageType: contentType === 'media' ? mediaType : 'text',
        externalId,
        mediaUrl: contentType === 'media' ? mediaUrl : null,
      })

      await log('message', {
        contentType,
        text,
        mediaUrl: contentType === 'media' ? mediaUrl : undefined,
        externalId,
        testMode: ctx.isTest === true,
      })
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
    const seconds = Math.min(
      Math.max(Number(node.data?.seconds || 1), 1),
      SCHEDULED_DELAY_MAX_SECONDS,
    )

    if (seconds <= INLINE_DELAY_MAX_SECONDS || ctx.isTest) {
      if (!ctx.isTest)
        await sleep(seconds * 1000)
      await log('delay', { seconds, inline: !ctx.isTest })
      return 'output_1'
    }

    await log('delay', { seconds, scheduled: true })
    return FLOW_DELAY_SCHEDULE_KEY
  }

  if (nodeType === 'wait_reply') {
    if (ctx.isTest) {
      await log('wait_reply', { testMode: true })
      return 'output_1'
    }

    if (!ctx.conversationId) {
      await log('wait_reply', { skipped: true }, 'Conversation is required')
      return 'output_1'
    }

    await log('wait_reply', { waiting: true })
    return FLOW_WAIT_REPLY_KEY
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

  if (nodeType === 'tag') {
    const tagName = String(node.data?.tagName || '').trim()
    const action = String(node.data?.action || 'add') === 'remove' ? 'remove' : 'add'
    const target = String(node.data?.target || 'contact') === 'conversation' ? 'conversation' : 'contact'

    if (!tagName) {
      await log('tag', { skipped: true }, 'Tag name not configured')
      return 'output_1'
    }

    if (ctx.isTest) {
      await log('tag', { tagName, action, target, testMode: true })
      return 'output_1'
    }

    try {
      const result = await applyFlowTag(client, {
        tenantId: ctx.tenantId,
        contactId: ctx.contactId,
        conversationId: ctx.conversationId,
        tagName,
        action,
        target,
      })
      await log('tag', result)
      return 'output_1'
    }
    catch (error: any) {
      await log('tag', {}, error?.message || 'Tag action failed')
      return null
    }
  }

  if (nodeType === 'crm_update') {
    const createIfMissing = node.data?.createIfMissing !== false

    if (ctx.isTest) {
      await log('crm_update', { createIfMissing, testMode: true })
      return 'output_1'
    }

    try {
      const result = await applyFlowCrmUpdate(client, {
        tenantId: ctx.tenantId,
        contactId: ctx.contactId,
        conversationId: ctx.conversationId,
        createIfMissing,
      })
      await log('crm_update', result)
      return 'output_1'
    }
    catch (error: any) {
      await log('crm_update', {}, error?.message || 'CRM sync failed')
      return null
    }
  }

  if (nodeType === 'handoff') {
    const status = String(node.data?.status || 'pending') as 'open' | 'pending' | 'resolved' | 'spam'
    const assignToUserId = node.data?.assignToUserId ? String(node.data.assignToUserId) : null
    const stopFlow = node.data?.stopFlow !== false

    if (ctx.isTest) {
      await log('handoff', { status, assignToUserId, stopFlow, testMode: true })
      return stopFlow ? null : 'output_1'
    }

    try {
      const result = await applyFlowHandoff(client, {
        tenantId: ctx.tenantId,
        conversationId: ctx.conversationId,
        status,
        assignToUserId,
        note: node.data?.note ? String(node.data.note) : null,
      })
      await log('handoff', result)
      return stopFlow ? null : 'output_1'
    }
    catch (error: any) {
      await log('handoff', {}, error?.message || 'Handoff failed')
      return null
    }
  }

  if (nodeType === 'action') {
    const actionType = String(node.data?.actionType || 'mark_read') as FlowActionType

    if (ctx.isTest) {
      await log('action', { actionType, testMode: true })
      return 'output_1'
    }

    try {
      const result = await applyFlowAction(client, {
        tenantId: ctx.tenantId,
        contactId: ctx.contactId,
        conversationId: ctx.conversationId,
        actionType,
        priority: Number(node.data?.priority || 1),
      })
      await log('action', result)
      return 'output_1'
    }
    catch (error: any) {
      await log('action', {}, error?.message || 'Action failed')
      return null
    }
  }

  if (nodeType === 'ai_agent') {
    const agentId = String(node.data?.agentId || '').trim()
    const sendReply = node.data?.sendReply !== false

    if (!agentId) {
      await log('ai_agent', { skipped: true }, 'Agent not selected')
      return 'output_1'
    }

    if (ctx.isTest) {
      await log('ai_agent', { agentId, sendReply, testMode: true })
      return 'output_1'
    }

    try {
      const { reply, tokensUsed, sessionId, historyMessages } = await runWhatsAppAgentReply(client, {
        tenantId: ctx.tenantId,
        agentId,
        ctx: {
          tenantId: ctx.tenantId,
          messageContent: ctx.messageContent,
          contactPhone: ctx.contactPhone,
          contactName: ctx.contactName,
          conversationId: ctx.conversationId,
          contactId: ctx.contactId,
          messageId: ctx.messageId,
          isTest: ctx.isTest,
        },
      })

      if (sendReply && reply) {
        const { instance, integration } = await loadInstanceWithIntegrationByClient(client, ctx.instanceId)
        const providerResult = await sendWhatsAppTextMessage({
          instance,
          integration,
          phone: ctx.contactPhone,
          remoteJid: ctx.remoteJid,
          text: reply,
        }) as any

        const externalId = extractProviderMessageId(providerResult)
        await persistFlowOutboundMessage(client, ctx, {
          content: reply,
          messageType: 'text',
          externalId,
        })
      }

      await log('ai_agent', { agentId, reply, tokensUsed, sessionId, sendReply, historyMessages })
      return 'output_1'
    }
    catch (error: any) {
      await log('ai_agent', {}, error?.message || 'Agent failed')
      throw error
    }
  }

  await log('unknown', { nodeType }, 'Unsupported node type')
  return null
}

async function scheduleFlowDelay(
  client: SupabaseClient,
  params: {
    executionId: string
    tenantId: string
    flowId: string
    delaySeconds: number
    currentNode: DrawflowNode
    canvas: DrawflowExport
    input: FlowExecutionInput
  },
) {
  const connections = getDrawflowConnections(params.currentNode, 'output_1')
  const resumeAt = new Date(Date.now() + params.delaySeconds * 1000).toISOString()

  await client
    .from('whatsapp_flow_execution')
    .update({
      status: 'waiting',
      context: {
        waitType: 'delay',
        resumeAt,
        resumeConnections: connections,
        input: params.input,
        flowId: params.flowId,
        pausedFromNodeId: params.currentNode.id,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.executionId)
    .eq('tenant_id', params.tenantId)
}

async function scheduleFlowWaitReply(
  client: SupabaseClient,
  params: {
    executionId: string
    tenantId: string
    flowId: string
    conversationId: string
    currentNode: DrawflowNode
    input: FlowExecutionInput
  },
) {
  const connections = getDrawflowConnections(params.currentNode, 'output_1')
  const now = new Date().toISOString()

  await client
    .from('whatsapp_flow_execution')
    .update({
      status: 'cancelled',
      completed_at: now,
      updated_at: now,
      context: {
        cancelledReason: 'superseded_by_new_wait_reply',
      },
    })
    .eq('tenant_id', params.tenantId)
    .eq('conversation_id', params.conversationId)
    .eq('status', 'waiting_reply')
    .neq('id', params.executionId)

  await client
    .from('whatsapp_flow_execution')
    .update({
      status: 'waiting_reply',
      context: {
        waitType: 'reply',
        resumeConnections: connections,
        input: params.input,
        flowId: params.flowId,
        pausedFromNodeId: params.currentNode.id,
      },
      updated_at: now,
    })
    .eq('id', params.executionId)
    .eq('tenant_id', params.tenantId)
}

async function walkFlow(
  client: SupabaseClient,
  canvas: DrawflowExport,
  startNode: DrawflowNode,
  ctx: RuntimeContext,
  executionId: string,
  tenantId: string,
  flowId: string,
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

  if (outputKey === FLOW_DELAY_SCHEDULE_KEY) {
    const seconds = Math.min(
      Math.max(Number(startNode.data?.seconds || 1), 1),
      SCHEDULED_DELAY_MAX_SECONDS,
    )
    await scheduleFlowDelay(client, {
      executionId,
      tenantId,
      flowId,
      delaySeconds: seconds,
      currentNode: startNode,
      canvas,
      input: ctx,
    })
    return
  }

  if (outputKey === FLOW_WAIT_REPLY_KEY) {
    if (!ctx.conversationId)
      return

    await scheduleFlowWaitReply(client, {
      executionId,
      tenantId,
      flowId,
      conversationId: ctx.conversationId,
      currentNode: startNode,
      input: ctx,
    })
    return
  }

  if (!outputKey)
    return

  const nodeMap = new Map(getDrawflowNodes(canvas).map(node => [node.id, node]))
  const connections = getDrawflowConnections(startNode, outputKey)

  for (const conn of connections) {
    const nextNode = nodeMap.get(conn.targetNodeId)
    if (nextNode)
      await walkFlow(client, canvas, nextNode, ctx, executionId, tenantId, flowId, visited)
  }
}

export async function continueFlowFromNode(
  client: SupabaseClient,
  canvas: DrawflowExport,
  startNode: DrawflowNode,
  input: FlowExecutionInput,
  executionId: string,
  tenantId: string,
  flowId: string,
) {
  const ctx = buildRuntimeContext(input)
  await walkFlow(client, canvas, startNode, ctx, executionId, tenantId, flowId, new Set())
  return finalizeExecutionAfterWalk(client, executionId)
}

async function resumeFlowExecution(
  client: SupabaseClient,
  execution: {
    id: string
    tenant_id: string
    flow_id: string
    context: Record<string, unknown> | null
  },
  input: FlowExecutionInput,
) {
  const context = (execution.context || {}) as Record<string, any>
  const now = new Date().toISOString()

  const { data: flow } = await client
    .from('whatsapp_flow')
    .select('id, tenant_id, viewport, status')
    .eq('id', execution.flow_id)
    .eq('tenant_id', execution.tenant_id)
    .maybeSingle()

  if (!flow || flow.status !== 'active') {
    await client
      .from('whatsapp_flow_execution')
      .update({
        status: 'cancelled',
        completed_at: now,
        updated_at: now,
      })
      .eq('id', execution.id)
    return { status: 'cancelled' as const }
  }

  const canvas = getCanvasFromViewport(flow.viewport as Record<string, unknown>)
  const connections = (context.resumeConnections || []) as Array<{ targetNodeId: number }>
  if (!canvas || !connections.length)
    return { status: 'failed' as const }

  const nodeMap = new Map(getDrawflowNodes(canvas).map(node => [node.id, node]))

  await client
    .from('whatsapp_flow_execution')
    .update({
      status: 'running',
      context: {
        ...context,
        input,
        resumedAt: now,
        resumedMessageId: input.messageId,
      },
      updated_at: now,
    })
    .eq('id', execution.id)

  try {
    for (const conn of connections) {
      const nextNode = nodeMap.get(Number(conn.targetNodeId))
      if (nextNode)
        await continueFlowFromNode(client, canvas, nextNode, input, execution.id, execution.tenant_id, flow.id)
    }

    const finalStatus = await finalizeExecutionAfterWalk(client, execution.id)
    return { status: finalStatus }
  }
  catch (error: any) {
    await client
      .from('whatsapp_flow_execution')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        context: { ...context, input, error: error?.message || 'Resume failed' },
        updated_at: new Date().toISOString(),
      })
      .eq('id', execution.id)

    throw error
  }
}

export async function resumeWaitingFlowOnInboundMessage(
  client: SupabaseClient,
  params: FlowExecutionInput,
): Promise<{ resumed: boolean, executionId?: string, status?: string }> {
  if (params.fromMe || params.isTest || !params.conversationId)
    return { resumed: false }

  const { data: execution } = await client
    .from('whatsapp_flow_execution')
    .select('id, tenant_id, flow_id, context')
    .eq('tenant_id', params.tenantId)
    .eq('conversation_id', params.conversationId)
    .eq('status', 'waiting_reply')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!execution)
    return { resumed: false }

  const context = (execution.context || {}) as Record<string, any>
  if (context.resumedMessageId === params.messageId)
    return { resumed: true, executionId: execution.id, status: 'running' }

  const resumedInput: FlowExecutionInput = {
    ...params,
    messageContent: params.messageContent.trim() || '[Mídia recebida]',
  }

  const result = await resumeFlowExecution(client, execution, resumedInput)
  return {
    resumed: true,
    executionId: execution.id,
    status: result.status,
  }
}

export async function processWaitingFlowExecutions(client: SupabaseClient, limit = 20) {
  const now = new Date().toISOString()

  const { data: executions } = await client
    .from('whatsapp_flow_execution')
    .select('id, tenant_id, flow_id, context')
    .eq('status', 'waiting')
    .limit(limit)

  if (!executions?.length)
    return { processed: 0 }

  let processed = 0

  for (const execution of executions) {
    const context = (execution.context || {}) as Record<string, any>
    const resumeAt = String(context.resumeAt || '')
    if (!resumeAt || resumeAt > now)
      continue

    const { data: flow } = await client
      .from('whatsapp_flow')
      .select('id, tenant_id, viewport, status')
      .eq('id', execution.flow_id)
      .eq('tenant_id', execution.tenant_id)
      .maybeSingle()

    if (!flow || flow.status !== 'active') {
      await client
        .from('whatsapp_flow_execution')
        .update({
          status: 'cancelled',
          completed_at: now,
          updated_at: now,
        })
        .eq('id', execution.id)
      continue
    }

    const canvas = getCanvasFromViewport(flow.viewport as Record<string, unknown>)
    const input = context.input as FlowExecutionInput
    const connections = (context.resumeConnections || []) as Array<{ targetNodeId: number }>
    if (!canvas || !input || !connections.length)
      continue

    const nodeMap = new Map(getDrawflowNodes(canvas).map(node => [node.id, node]))

    await client
      .from('whatsapp_flow_execution')
      .update({ status: 'running', updated_at: now })
      .eq('id', execution.id)

    try {
      for (const conn of connections) {
        const nextNode = nodeMap.get(Number(conn.targetNodeId))
        if (nextNode)
          await walkFlow(client, canvas, nextNode, buildRuntimeContext(input), execution.id, execution.tenant_id, flow.id, new Set())
      }

      await finalizeExecutionAfterWalk(client, execution.id)

      processed++
    }
    catch (error: any) {
      await client
        .from('whatsapp_flow_execution')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          context: { ...context, error: error?.message || 'Resume failed' },
          updated_at: new Date().toISOString(),
        })
        .eq('id', execution.id)
    }
  }

  return { processed }
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
    await walkFlow(client, canvas, triggerNode, ctx, execution.id, flow.tenant_id, flow.id)

    const finalStatus = await finalizeExecutionAfterWalk(client, execution.id)

    if (finalStatus === 'waiting' || finalStatus === 'waiting_reply') {
      return { executionId: execution.id, status: finalStatus, isTest: input.isTest === true }
    }

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