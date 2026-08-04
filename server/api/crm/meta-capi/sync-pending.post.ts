import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

import { createError, defineEventHandler, readBody } from 'h3'

import {
  processMetaConversionQueue,
  scheduleMetaCapiProcessing,
  syncPendingWonPurchases,
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

  const client = await serverSupabaseServiceRole(event)
  const syncResult = await syncPendingWonPurchases(client, {
    tenantId,
    limit: Number(body?.limit) || 50,
    force: Boolean(body?.force),
  })

  const processResult = await processMetaConversionQueue(client, {
    tenantId,
    limit: 50,
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
