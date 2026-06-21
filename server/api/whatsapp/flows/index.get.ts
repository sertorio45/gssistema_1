import { serverSupabaseServiceRole } from '#supabase/server'
import { getQuery } from 'h3'

import { mapFlowRow } from '~/composables/whatsapp/useWhatsAppMapper'
import { resolveWhatsAppTenantContext } from '~/server/utils/whatsapp/context'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const { tenantId } = await resolveWhatsAppTenantContext(event, query.tenant_id as string | undefined)
  const client = serverSupabaseServiceRole(event)

  let dbQuery = client
    .from('whatsapp_flow')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('updated_at', { ascending: false })

  if (query.status && query.status !== 'all')
    dbQuery = dbQuery.eq('status', String(query.status))

  if (query.search)
    dbQuery = dbQuery.ilike('name', `%${String(query.search)}%`)

  const { data, error } = await dbQuery
  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  const flowIds = (data || []).map(row => row.id)
  let executionCounts: Record<string, number> = {}

  if (flowIds.length) {
    const { data: executions } = await client
      .from('whatsapp_flow_execution')
      .select('flow_id')
      .in('flow_id', flowIds)

    executionCounts = (executions || []).reduce((acc, row) => {
      acc[row.flow_id] = (acc[row.flow_id] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  return {
    data: (data || []).map(row => ({
      ...mapFlowRow(row as any),
      executionsCount: executionCounts[row.id] || 0,
    })),
  }
})
