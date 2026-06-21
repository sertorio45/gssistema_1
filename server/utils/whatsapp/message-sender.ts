import { createError } from 'h3'

import { WHATSAPP_CLOUD_API_ENABLED } from '~/constants/whatsapp'
import {
  cloudApiSendText,
  getCloudApiConfigFromIntegration,
} from '~/server/utils/whatsapp/cloud-api-client'
import {
  evolutionSendText,
  getEvolutionConfigFromIntegration,
} from '~/server/utils/whatsapp/evolution-client'
import { getEvolutionInstanceName } from '~/server/utils/whatsapp/instance-loader'

function resolveEvolutionNumber(phone: string, remoteJid?: string): string {
  const fromPhone = phone.replace(/\D/g, '')
  if (fromPhone.length >= 10)
    return fromPhone

  const fromJid = String(remoteJid || '').replace(/@.*/, '').replace(/\D/g, '')
  if (fromJid.length >= 10)
    return fromJid

  throw createError({
    statusCode: 400,
    statusMessage: 'Invalid WhatsApp number for send',
  })
}

export async function sendWhatsAppTextMessage(params: {
  instance: Record<string, any>
  integration: Record<string, any>
  phone: string
  text: string
  remoteJid?: string
}) {
  const { instance, integration, phone, remoteJid } = params
  const normalizedPhone = phone.replace(/\D/g, '')

  if (!integration) {
    throw createError({
      statusCode: 400,
      statusMessage: 'WhatsApp integration not configured for this instance',
    })
  }

  if (instance.provider === 'evolution') {
    const evoConfig = getEvolutionConfigFromIntegration(
      integration,
      getEvolutionInstanceName(instance),
    )
    if (!evoConfig)
      throw createError({ statusCode: 400, statusMessage: 'Evolution API not configured' })

    const recipient = resolveEvolutionNumber(phone, remoteJid)
    return evolutionSendText(evoConfig, { number: recipient, text: params.text })
  }

  if (instance.provider === 'cloud_api') {
    if (!WHATSAPP_CLOUD_API_ENABLED) {
      throw createError({
        statusCode: 503,
        statusMessage: 'WhatsApp Cloud API oficial estará disponível em breve.',
      })
    }

    const cloudConfig = getCloudApiConfigFromIntegration(integration)
    if (!cloudConfig)
      throw createError({ statusCode: 400, statusMessage: 'Cloud API not configured' })

    return cloudApiSendText(cloudConfig, { to: normalizedPhone, text: params.text })
  }

  throw createError({ statusCode: 400, statusMessage: 'Unsupported provider' })
}
