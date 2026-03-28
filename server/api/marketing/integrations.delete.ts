import { serverSupabaseServiceRole } from '#supabase/server'
import { createError, defineEventHandler, readBody } from 'h3'

import { clearMarketingCampaignCacheForTenant, resolveMarketingTenantContext } from '~/server/utils/marketing'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const provider = body?.provider as string | undefined
  if (!provider) {
    throw createError({ statusCode: 400, statusMessage: 'provider é obrigatório' })
  }

  const { tenantId } = await resolveMarketingTenantContext(event, body?.tenant_id)
  const client = await serverSupabaseServiceRole(event)

  const { error } = await client
    .from('marketing_integrations')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('provider', provider)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  await clearMarketingCampaignCacheForTenant(client, tenantId)

  return { success: true }
})
