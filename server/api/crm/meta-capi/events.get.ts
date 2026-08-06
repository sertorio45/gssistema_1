import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

import { createError, defineEventHandler, getQuery } from 'h3'

import {
  assertScopedTenantAccess,
  assertTenantModuleAccess,
  resolveTenantApiAuth,
} from '~/server/utils/tenant-access'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user)
    throw createError({ statusCode: 401, statusMessage: 'Não autorizado' })

  const query = getQuery(event)
  const { role, tenantId: userTenantId } = resolveTenantApiAuth(user as any, event.context.auth?.tenantId)
  assertTenantModuleAccess(role)

  const tenantId = (query.tenant_id as string) || userTenantId
  if (!tenantId)
    throw createError({ statusCode: 400, statusMessage: 'Tenant ID é obrigatório' })
  assertScopedTenantAccess(role, userTenantId, tenantId)

  const limit = Math.min(Math.max(Number(query.limit) || 30, 1), 100)
  const client = await serverSupabaseServiceRole(event)

  const { data, error } = await client
    .from('crm_meta_conversion_events')
    .select(`
      id,
      lead_id,
      event_name,
      event_id,
      event_time,
      action_source,
      status,
      attempts,
      last_error,
      sent_at,
      created_at,
      updated_at,
      is_test,
      crm_lead:crm_lead!crm_meta_conversion_events_lead_id_fkey(id, name, value, status)
    `)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  return {
    data: (data || []).map((row: any) => {
      const lead = Array.isArray(row.crm_lead) ? row.crm_lead[0] : row.crm_lead
      return {
        id: row.id,
        lead_id: row.lead_id,
        lead_name: lead?.name || (row.is_test ? 'Evento de teste' : null),
        lead_value: lead?.value ?? null,
        event_name: row.event_name,
        event_id: row.event_id,
        event_time: row.event_time,
        action_source: row.action_source,
        status: row.status,
        attempts: row.attempts,
        last_error: row.last_error,
        sent_at: row.sent_at,
        created_at: row.created_at,
        updated_at: row.updated_at,
        is_test: Boolean(row.is_test),
      }
    }),
  }
})
