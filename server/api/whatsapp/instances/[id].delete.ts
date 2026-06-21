import { createError, getQuery } from 'h3'

import { resolveWhatsAppTenantContext } from '~/server/utils/whatsapp/context'
import {
  evolutionDeleteInstance,
  getEvolutionConfigFromIntegration,
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

  if (instance.provider === 'evolution' && integration) {
    const linkExisting = Boolean(instance.metadata?.evolution_link_existing)
    if (!linkExisting) {
      const evoConfig = getEvolutionConfigFromIntegration(integration, getEvolutionInstanceName(instance))
      if (evoConfig) {
        try {
          await evolutionDeleteInstance(evoConfig)
        }
        catch {
          /* remote instance may already be removed */
        }
      }
    }
  }

  await client.from('whatsapp_integration').delete().eq('instance_id', id)
  await client.from('whatsapp_instance').delete().eq('id', id)

  return { success: true }
})
