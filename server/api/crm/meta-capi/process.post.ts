import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

import { createError, defineEventHandler, readBody } from 'h3'

import { processMetaConversionQueue } from '~/server/utils/crm/meta-capi'
import {
  assertScopedTenantAccess,
  assertTenantModuleAccess,
  resolveTenantApiAuth,
} from '~/server/utils/tenant-access'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user)
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const body = await readBody(event).catch(() => ({}))
  const { role, tenantId: userTenantId } = resolveTenantApiAuth(user as any, event.context.auth?.tenantId)
  assertTenantModuleAccess(role)

  const tenantId = body?.tenant_id || userTenantId
  if (!tenantId)
    throw createError({ statusCode: 400, statusMessage: 'Tenant ID is required' })
  assertScopedTenantAccess(role, userTenantId, tenantId)

  const client = await serverSupabaseServiceRole(event)
  const result = await processMetaConversionQueue(client, {
    tenantId,
    limit: Number(body?.limit) || 20,
  })

  return { data: result }
})
