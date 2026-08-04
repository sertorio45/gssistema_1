import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

import { createError, defineEventHandler, readBody } from 'h3'

import {
  processMetaConversionQueue,
  scheduleMetaCapiProcessing,
  syncSelectedWonPurchases,
} from '~/server/utils/crm/meta-capi'
import {
  assertScopedTenantAccess,
  assertTenantModuleAccess,
  resolveTenantApiAuth,
} from '~/server/utils/tenant-access'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user)
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const body = await readBody(event)
  const { role, tenantId: userTenantId } = resolveTenantApiAuth(user as any, event.context.auth?.tenantId)
  assertTenantModuleAccess(role)

  const tenantId = body?.tenant_id || userTenantId
  if (!tenantId)
    throw createError({ statusCode: 400, statusMessage: 'Tenant ID is required' })
  assertScopedTenantAccess(role, userTenantId, tenantId)

  const leadIds = Array.isArray(body?.lead_ids)
    ? body.lead_ids.map((id: unknown) => String(id)).filter(Boolean)
    : []

  if (!leadIds.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Selecione ao menos um lead em Ganho para enviar',
    })
  }

  const client = await serverSupabaseServiceRole(event)
  const syncResult = await syncSelectedWonPurchases(client, {
    tenantId,
    leadIds,
    force: Boolean(body?.force),
  })

  const processResult = await processMetaConversionQueue(client, {
    tenantId,
    limit: Math.min(leadIds.length + 10, 50),
  })

  scheduleMetaCapiProcessing(event, client, tenantId)

  return {
    data: {
      ...syncResult,
      processed: processResult.processed,
      sent: processResult.sent,
    },
  }
})
