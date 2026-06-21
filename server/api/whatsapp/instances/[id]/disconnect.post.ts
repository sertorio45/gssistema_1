import { createError, getQuery } from 'h3'

import { resolveWhatsAppTenantContext } from '~/server/utils/whatsapp/context'
import { evolutionLogout, getEvolutionConfigFromIntegration } from '~/server/utils/whatsapp/evolution-client'
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

  if (instance.provider === 'evolution' && integration) {
    const evoConfig = getEvolutionConfigFromIntegration(integration, getEvolutionInstanceName(instance))
    if (evoConfig) {
      try {
        await evolutionLogout(evoConfig)
      }
      catch {
        /* ignore */
      }
    }
  }

  await client
    .from('whatsapp_instance')
    .update({
      status: 'disconnected',
      qr_code: null,
      phone_number: null,
      connection_state: {},
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  return { success: true }
})
