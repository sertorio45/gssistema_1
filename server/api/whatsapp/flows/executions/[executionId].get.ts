import { serverSupabaseServiceRole } from '#supabase/server'
import { createError, getQuery, getRouterParam } from 'h3'

import { resolveWhatsAppTenantContext } from '~/server/utils/whatsapp/context'

export default defineEventHandler(async (event) => {
  const executionId = getRouterParam(event, 'executionId')
  if (!executionId)
    throw createError({ statusCode: 400, statusMessage: 'executionId is required' })

  const query = getQuery(event)
  const { tenantId } = await resolveWhatsAppTenantContext(event, query.tenant_id as string | undefined)
  const client = serverSupabaseServiceRole(event)

  const { data: execution, error: executionError } = await client
    .from('whatsapp_flow_execution')
    .select('id, flow_id, status, started_at, completed_at, context')
    .eq('id', executionId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (executionError || !execution)
    throw createError({ statusCode: 404, statusMessage: 'Execution not found' })

  const { data: logs, error: logsError } = await client
    .from('whatsapp_flow_execution_log')
    .select('id, action, input, output, error, executed_at')
    .eq('execution_id', executionId)
    .eq('tenant_id', tenantId)
    .order('executed_at', { ascending: true })

  if (logsError)
    throw createError({ statusCode: 400, statusMessage: logsError.message })

  return {
    data: {
      id: execution.id,
      flowId: execution.flow_id,
      status: execution.status,
      startedAt: execution.started_at,
      completedAt: execution.completed_at,
      context: execution.context || {},
      logs: (logs || []).map(log => ({
        id: log.id,
        action: log.action,
        input: log.input || {},
        output: log.output || {},
        error: log.error,
        executedAt: log.executed_at,
      })),
    },
  }
})
