import { createError, getQuery } from 'h3'

import { resolveWhatsAppTenantContext } from '~/server/utils/whatsapp/context'
import {
  cloudApiGetPhoneNumber,
  getCloudApiConfigFromIntegration,
} from '~/server/utils/whatsapp/cloud-api-client'
import {
  evolutionConnectionState,
  getEvolutionConfigFromIntegration,
  mapEvolutionConnectionState,
} from '~/server/utils/whatsapp/evolution-client'
import { getEvolutionInstanceName, loadInstanceWithIntegration } from '~/server/utils/whatsapp/instance-loader'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, statusMessage: 'id is required' })

  const query = getQuery(event)
  const { tenantId } = await resolveWhatsAppTenantContext(event, query.tenant_id as string | undefined)
  const { client, instance, integration } = await loadInstanceWithIntegration(event, id)

  if (instance.tenant_id !== tenantId)
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  if (!integration)
    throw createError({ statusCode: 400, statusMessage: 'Integration not configured' })

  try {
    if (instance.provider === 'evolution') {
      const evoConfig = getEvolutionConfigFromIntegration(integration, getEvolutionInstanceName(instance))
      if (!evoConfig)
        throw new Error('Missing Evolution credentials')

      const raw = await evolutionConnectionState(evoConfig)
      const mapped = mapEvolutionConnectionState(raw as Record<string, unknown>)

      await client
        .from('whatsapp_instance')
        .update({
          status: mapped.status,
          phone_number: mapped.phoneNumber || instance.phone_number,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      return { success: true, provider: 'evolution', status: mapped.status }
    }

    const cloudConfig = getCloudApiConfigFromIntegration(integration)
    if (!cloudConfig)
      throw new Error('Missing Cloud API credentials')

    const phone = await cloudApiGetPhoneNumber(cloudConfig)
    await client
      .from('whatsapp_instance')
      .update({
        status: 'connected',
        phone_number: phone.display_phone_number || instance.phone_number,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    return {
      success: true,
      provider: 'cloud_api',
      status: 'connected',
      phoneNumber: phone.display_phone_number,
      verifiedName: phone.verified_name,
    }
  }
  catch (error: any) {
    await client
      .from('whatsapp_instance')
      .update({ status: 'error', updated_at: new Date().toISOString() })
      .eq('id', id)

    throw createError({
      statusCode: 400,
      statusMessage: error?.data?.message || error?.message || 'Connection test failed',
    })
  }
})
