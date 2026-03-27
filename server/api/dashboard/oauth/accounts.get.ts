import { serverSupabaseServiceRole } from '#supabase/server'
import { createError, defineEventHandler, getQuery } from 'h3'

import { decryptSecret, resolveDashboardTenantContext } from '~/server/utils/dashboard'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const provider = String(query.provider || '')
  if (!['google_ads', 'google_analytics', 'meta'].includes(provider)) {
    throw createError({ statusCode: 400, statusMessage: 'Provider inválido' })
  }

  const { tenantId } = await resolveDashboardTenantContext(event, query.tenant_id as string | undefined)
  const client = await serverSupabaseServiceRole(event)

  const { data: integration } = await client
    .from('dashboard_integrations')
    .select('config')
    .eq('tenant_id', tenantId)
    .eq('provider', provider)
    .maybeSingle()

  const token = decryptSecret(integration?.config?.access_token_enc)
  const developerToken = decryptSecret(integration?.config?.developer_token_enc)
  if (!token) {
    return { data: [] }
  }

  if (provider === 'google_ads') {
    const response = await $fetch<any>('https://googleads.googleapis.com/v19/customers:listAccessibleCustomers', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'developer-token': developerToken || '',
      },
    }).catch(() => ({ resourceNames: [] }))
    const data = (response.resourceNames || []).map((name: string) => {
      const id = name.split('/').pop() || name
      return { id, name: `Conta Google Ads ${id}` }
    })
    return { data }
  }

  if (provider === 'google_analytics') {
    const response = await $fetch<any>('https://analyticsadmin.googleapis.com/v1beta/accountSummaries', {
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => ({ accountSummaries: [] }))
    const data = (response.accountSummaries || []).flatMap((summary: any) => {
      const accountId = summary.account?.split('/').pop() || ''
      const accountName = summary.displayName || `Conta ${accountId}`
      const properties = (summary.propertySummaries || []).map((property: any) => ({
        id: property.property?.split('/').pop() || property.property,
        name: `${accountName} - ${property.displayName || property.property}`,
        account_id: accountId,
      }))
      return properties.length ? properties : [{ id: accountId, name: accountName, account_id: accountId }]
    })
    return { data }
  }

  const metaResponse = await $fetch<any>('https://graph.facebook.com/v20.0/me/adaccounts', {
    query: {
      fields: 'id,name,account_status',
      access_token: token,
    },
  }).catch((error: any) => {
    throw createError({
      statusCode: error?.statusCode || 502,
      statusMessage: error?.data?.error?.message || error?.message || 'Falha ao listar contas Meta',
    })
  })

  return {
    data: (metaResponse.data || []).map((row: any) => ({
      id: String(row.id || '').replace('act_', ''),
      name: `${row.name || row.id} (${row.account_status || 'status desconhecido'})`,
    })),
  }
})
