import { createError, getQuery } from 'h3'

import {
  buildEvolutionWebhookUrl,
  resolveWhatsAppTenantContext,
} from '~/server/utils/whatsapp/context'
import {
  evolutionConnect,
  evolutionSetWebhook,
  getEvolutionConfigFromIntegration,
  syncEvolutionInstanceRecord,
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

  if (instance.provider !== 'evolution') {
    throw createError({ statusCode: 400, statusMessage: 'Connect is only available for Evolution API' })
  }

  if (!integration) {
    throw createError({ statusCode: 400, statusMessage: 'Integration not configured' })
  }

  const evoConfig = getEvolutionConfigFromIntegration(integration, getEvolutionInstanceName(instance))
  if (!evoConfig)
    throw createError({ statusCode: 400, statusMessage: 'Evolution API credentials missing' })

  const webhookUrl = buildEvolutionWebhookUrl(event, id)

  try {
    await evolutionSetWebhook(evoConfig, webhookUrl)
  }
  catch {
    /* webhook may already be configured */
  }

  const mapped = await syncEvolutionInstanceRecord(client, id, evoConfig, {
    currentQrCode: instance.qr_code,
  })

  if (mapped.status === 'connected') {
    return {
      data: {
        status: 'connected',
        qrCode: null,
        pairingCode: null,
        alreadyConnected: true,
        phoneNumber: mapped.phoneNumber || instance.phone_number,
      },
    }
  }

  const result = await evolutionConnect(evoConfig)
  const qrCode = result.base64 || result.code || null

  await client
    .from('whatsapp_instance')
    .update({
      status: 'connecting',
      qr_code: qrCode,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  return {
    data: {
      status: 'connecting',
      qrCode,
      pairingCode: result.pairingCode || null,
      alreadyConnected: false,
    },
  }
})
