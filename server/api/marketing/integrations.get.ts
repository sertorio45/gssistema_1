import { defineEventHandler, getQuery } from 'h3'

import { decryptSecret, maskSensitiveValue } from '~/server/utils/marketing'
import { requireSocialContext } from '~/server/utils/social-context'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const { tenantId, client } = await requireSocialContext(
    event,
    'marketing.social.integrations',
    query.tenant_id as string | undefined,
  )

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
    const pageToken = decryptSecret(config.page_access_token_enc)
    const missingPublishScopes = Array.isArray(config.missing_publish_scopes)
      ? config.missing_publish_scopes
      : []

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
        page_access_token_enc: undefined,
      },
      has_key: Boolean(token),
      has_page_token: Boolean(pageToken),
      missing_publish_scopes: missingPublishScopes,
      can_publish: row.provider === 'meta'
        ? Boolean(pageToken) && missingPublishScopes.length === 0
        : Boolean(token),
      masked_key: maskSensitiveValue(token),
    }
  })

  return { data: sanitized }
})
