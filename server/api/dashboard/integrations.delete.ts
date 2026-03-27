import { serverSupabaseServiceRole } from '#supabase/server'
import { createError, defineEventHandler, readBody } from 'h3'

import { clearDashboardCampaignCacheForTenant, resolveDashboardTenantContext } from '~/server/utils/dashboard'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const provider = body?.provider as string | undefined
  if (!provider) {
    throw createError({ statusCode: 400, statusMessage: 'provider é obrigatório' })
  }

  const { tenantId } = await resolveDashboardTenantContext(event, body?.tenant_id)
  const client = await serverSupabaseServiceRole(event)

  const { error } = await client
    .from('dashboard_integrations')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('provider', provider)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  await clearDashboardCampaignCacheForTenant(client, tenantId)

  return { success: true }
})
