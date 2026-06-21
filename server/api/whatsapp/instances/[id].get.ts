import { createError, getQuery } from 'h3'

import {
  buildCloudWebhookUrl,
  buildEvolutionWebhookUrl,
  resolveWhatsAppTenantContext,
  sanitizeInstanceRow,
} from '~/server/utils/whatsapp/context'
import { getEvolutionInstanceName, loadInstanceWithIntegration } from '~/server/utils/whatsapp/instance-loader'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, statusMessage: 'id is required' })

  const query = getQuery(event)
  const { tenantId } = await resolveWhatsAppTenantContext(event, query.tenant_id as string | undefined)
  const { instance, integration } = await loadInstanceWithIntegration(event, id)

  if (instance.tenant_id !== tenantId) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const webhookUrl = instance.provider === 'cloud_api'
    ? buildCloudWebhookUrl(event, instance.id)
    : buildEvolutionWebhookUrl(event, instance.id)

  return {
    data: sanitizeInstanceRow(instance, integration),
    webhookUrl,
    evolutionInstanceName: getEvolutionInstanceName(instance),
  }
})
