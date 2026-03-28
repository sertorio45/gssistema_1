import { serverSupabaseServiceRole } from '#supabase/server'

import { defineEventHandler, getQuery } from 'h3'

import { decryptSecret, maskSensitiveValue, resolveMarketingTenantContext } from '~/server/utils/marketing'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const { tenantId } = await resolveMarketingTenantContext(event, query.tenant_id as string | undefined)
  const client = await serverSupabaseServiceRole(event)

  const { data, error } = await client
    .from('marketing_integrations')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('provider')

  if (error) {
    return { status: 400, message: error.message }
  }

  const sanitized = (data || []).map((row: any) => {
    const config = row.config || {}
    const token
      = decryptSecret(config.access_token_enc)
        || decryptSecret(config.refresh_token_enc)
        || decryptSecret(config.developer_token_enc)

    return {
      id: row.id,
      provider: row.provider,
      is_active: row.is_active,
      updated_at: row.updated_at,
      config: {
        ...config,
        access_token_enc: undefined,
        refresh_token_enc: undefined,
        developer_token_enc: undefined,
        client_id_enc: undefined,
        client_secret_enc: undefined,
      },
      has_key: Boolean(token),
      masked_key: maskSensitiveValue(token),
    }
  })

  return { data: sanitized }
})
