import { createError } from 'h3'

import {
  cloudApiSendText,
  getCloudApiConfigFromIntegration,
} from '~/server/utils/whatsapp/cloud-api-client'
import {
  evolutionSendText,
  getEvolutionConfigFromIntegration,
} from '~/server/utils/whatsapp/evolution-client'
import { getEvolutionInstanceName } from '~/server/utils/whatsapp/instance-loader'

export async function sendWhatsAppTextMessage(params: {
  instance: Record<string, any>
  integration: Record<string, any>
  phone: string
  text: string
}) {
  const { instance, integration, phone } = params
  const normalizedPhone = phone.replace(/\D/g, '')

  if (instance.provider === 'evolution') {
    const evoConfig = getEvolutionConfigFromIntegration(
      integration,
      getEvolutionInstanceName(instance),
    )
    if (!evoConfig)
      throw createError({ statusCode: 400, statusMessage: 'Evolution API not configured' })

    return evolutionSendText(evoConfig, { number: normalizedPhone, text: params.text })
  }

  if (instance.provider === 'cloud_api') {
    const cloudConfig = getCloudApiConfigFromIntegration(integration)
    if (!cloudConfig)
      throw createError({ statusCode: 400, statusMessage: 'Cloud API not configured' })

    return cloudApiSendText(cloudConfig, { to: normalizedPhone, text: params.text })
  }

  throw createError({ statusCode: 400, statusMessage: 'Unsupported provider' })
}
