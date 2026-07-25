import { syncSocialAccountsFromIntegrations } from '~/server/utils/social-accounts'
import { requireSocialContext } from '~/server/utils/social-context'

export default defineEventHandler(async (event) => {
  const { client, tenantId } = await requireSocialContext(event, 'marketing.social.read')
  const listAccounts = () => client
    .from('social_accounts')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('platform')
    .order('name')

  const { data, error } = await listAccounts()

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })
  if (data?.length)
    return { data }

  await syncSocialAccountsFromIntegrations(client, tenantId)
  const { data: syncedData, error: syncedError } = await listAccounts()
  if (syncedError)
    throw createError({ statusCode: 400, statusMessage: syncedError.message })

  return { data: syncedData || [] }
})
