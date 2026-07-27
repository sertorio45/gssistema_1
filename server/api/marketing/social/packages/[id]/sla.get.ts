import { getRouterParam } from 'h3'

import { requireSocialContext } from '~/server/utils/social-context'

export default defineEventHandler(async (event) => {
  const packageId = String(getRouterParam(event, 'id'))
  const { client, tenantId } = await requireSocialContext(event, 'marketing.social.packages.read')

  const { data: pkg } = await client
    .from('social_client_packages')
    .select('id')
    .eq('id', packageId)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (!pkg)
    throw createError({ statusCode: 404, statusMessage: 'Pacote não encontrado' })

  const { data, error } = await client
    .from('social_package_sla_stages')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('package_id', packageId)
    .order('stage_key')

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  return { data: data || [] }
})
