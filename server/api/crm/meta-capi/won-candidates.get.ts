import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

import { createError, defineEventHandler, getQuery } from 'h3'

import { listWonLeadsForMetaSync } from '~/server/utils/crm/meta-capi'
import {
  assertScopedTenantAccess,
  assertTenantModuleAccess,
  resolveTenantApiAuth,
} from '~/server/utils/tenant-access'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user)
    throw createError({ statusCode: 401, statusMessage: 'Não autorizado' })

  const client = await serverSupabaseServiceRole(event)
  const query = getQuery(event)
  const { role, tenantId: userTenantId } = resolveTenantApiAuth(user as any, event.context.auth?.tenantId)
  assertTenantModuleAccess(role)

  const tenantId = (query.tenant_id as string) || userTenantId
  if (!tenantId)
    throw createError({ statusCode: 400, statusMessage: 'Tenant ID é obrigatório' })
  assertScopedTenantAccess(role, userTenantId, tenantId)

  const includeSent = String(query.include_sent || '') === '1'
  const data = await listWonLeadsForMetaSync(client, { tenantId, includeSent })

  return {
    data,
    meta: {
      total: data.length,
      eligible: data.filter(item => item.eligible).length,
    },
  }
})
