export async function syncSocialAccountsFromIntegrations(
  client: any,
  tenantId: string,
) {
  const { data: integrations, error } = await client
    .from('marketing_integrations')
    .select('id, provider, config')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .in('provider', ['meta', 'linkedin'])

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  const rows: Array<Record<string, unknown>> = []
  for (const integration of integrations || []) {
    const config = integration.config || {}
    const { error: deactivateError } = await client
      .from('social_accounts')
      .update({ is_active: false })
      .eq('tenant_id', tenantId)
      .eq('provider', integration.provider)
    if (deactivateError)
      throw createError({ statusCode: 400, statusMessage: deactivateError.message })

    if (integration.provider === 'meta') {
      if (config.page_id) {
        rows.push({
          tenant_id: tenantId,
          platform: 'facebook',
          provider: 'meta',
          integration_id: integration.id,
          external_account_id: String(config.page_id),
          name: String(config.page_name || `Página ${config.page_id}`),
          capabilities: ['publish_post'],
          is_active: true,
        })
      }
      if (config.instagram_business_account_id) {
        rows.push({
          tenant_id: tenantId,
          platform: 'instagram',
          provider: 'meta',
          integration_id: integration.id,
          external_account_id: String(config.instagram_business_account_id),
          name: String(config.instagram_name || `Instagram ${config.instagram_business_account_id}`),
          username: config.instagram_username || null,
          capabilities: ['publish_image', 'publish_video', 'publish_carousel'],
          is_active: true,
        })
      }
    }

    if (integration.provider === 'linkedin' && config.organization_id) {
      rows.push({
        tenant_id: tenantId,
        platform: 'linkedin',
        provider: 'linkedin',
        integration_id: integration.id,
        external_account_id: String(config.organization_id),
        name: String(config.organization_name || `LinkedIn ${config.organization_id}`),
        capabilities: ['publish_post', 'publish_image', 'publish_video'],
        is_active: true,
        token_expires_at: config.token_expires_at || null,
      })
    }
  }

  if (!rows.length)
    return

  const { error: syncError } = await client
    .from('social_accounts')
    .upsert(rows, { onConflict: 'tenant_id,platform,external_account_id' })

  if (syncError)
    throw createError({ statusCode: 400, statusMessage: syncError.message })
}
