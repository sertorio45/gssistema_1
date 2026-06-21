import { createHmac } from 'node:crypto'

import { decryptSecret } from '~/server/utils/whatsapp/context'

export interface CloudApiClientConfig {
  accessToken: string
  phoneNumberId: string
  apiVersion?: string
}

const DEFAULT_API_VERSION = 'v21.0'

function graphUrl(path: string, version = DEFAULT_API_VERSION): string {
  return `https://graph.facebook.com/${version}${path}`
}

export async function cloudApiGetPhoneNumber(config: CloudApiClientConfig) {
  return $fetch<{
    id: string
    display_phone_number?: string
    verified_name?: string
  }>(graphUrl(`/${config.phoneNumberId}`, config.apiVersion), {
    headers: { Authorization: `Bearer ${config.accessToken}` },
  })
}

export async function cloudApiSendText(
  config: CloudApiClientConfig,
  payload: { to: string, text: string },
) {
  return $fetch(graphUrl(`/${config.phoneNumberId}/messages`, config.apiVersion), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: {
      messaging_product: 'whatsapp',
      to: payload.to.replace(/\D/g, ''),
      type: 'text',
      text: { body: payload.text },
    },
  })
}

export async function cloudApiSubscribeApp(
  config: CloudApiClientConfig & { wabaId: string },
) {
  return $fetch(graphUrl(`/${config.wabaId}/subscribed_apps`, config.apiVersion), {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.accessToken}` },
  })
}

export function getCloudApiConfigFromIntegration(
  integration: Record<string, any>,
): CloudApiClientConfig | null {
  const accessToken = decryptSecret(integration.cloud_access_token_encrypted)
  const phoneNumberId = integration.cloud_phone_id as string | undefined
  if (!accessToken || !phoneNumberId)
    return null

  return { accessToken, phoneNumberId }
}

export function verifyCloudWebhookSignature(
  rawBody: string,
  signature: string | undefined,
  appSecret: string,
): boolean {
  if (!signature || !appSecret)
    return false

  const expected = `sha256=${createHmac('sha256', appSecret)
    .update(rawBody)
    .digest('hex')}`

  return signature === expected
}
