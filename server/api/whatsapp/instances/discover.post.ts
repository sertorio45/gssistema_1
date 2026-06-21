import { createError, readBody } from 'h3'

import { resolveWhatsAppTenantContext } from '~/server/utils/whatsapp/context'
import { evolutionFetchInstances } from '~/server/utils/whatsapp/evolution-client'

interface DiscoverBody {
  tenant_id?: string
  api_url?: string
  api_token?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<DiscoverBody>(event)
  await resolveWhatsAppTenantContext(event, body.tenant_id)

  if (!body.api_url?.trim() || !body.api_token?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'api_url and api_token are required' })
  }

  try {
    const data = await evolutionFetchInstances({
      baseUrl: body.api_url.trim(),
      apiToken: body.api_token.trim(),
    })

    return { data }
  }
  catch (error: any) {
    throw createError({
      statusCode: 400,
      statusMessage: error?.data?.message || error?.message || 'Failed to list Evolution instances',
    })
  }
})
