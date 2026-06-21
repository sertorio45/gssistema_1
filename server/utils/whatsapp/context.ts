import { randomUUID } from 'node:crypto'

import { getRequestURL } from 'h3'

import { resolveMarketingTenantContext, maskSensitiveValue } from '~/server/utils/marketing'

export { encryptSecret, decryptSecret } from '~/server/utils/marketing'
export { maskSensitiveValue }

export async function resolveWhatsAppTenantContext(event: any, requestedTenantId?: string) {
  return resolveMarketingTenantContext(event, requestedTenantId)
}

export function getPublicWebhookBaseUrl(event: any): string {
  const configured
    = process.env.NUXT_PUBLIC_SITE_URL
      || process.env.SITE_URL
      || process.env.NUXT_PUBLIC_API_URL
  if (configured)
    return configured.replace(/\/$/, '')

  const url = getRequestURL(event)
  return `${url.protocol}//${url.host}`
}

export function buildEvolutionWebhookUrl(event: any, instanceId: string): string {
  return `${getPublicWebhookBaseUrl(event)}/api/whatsapp/webhooks/evolution/${instanceId}`
}

export function buildCloudWebhookUrl(event: any, instanceId: string): string {
  return `${getPublicWebhookBaseUrl(event)}/api/whatsapp/webhooks/cloud/${instanceId}`
}

export function generateWebhookSecret(): string {
  return randomUUID().replace(/-/g, '')
}

export function sanitizeInstanceRow(row: Record<string, any>, integration?: Record<string, any> | null) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    provider: row.provider,
    phoneNumber: row.phone_number,
    status: row.status,
    qrCode: row.qr_code,
    connectionState: row.connection_state || {},
    isDefault: row.is_default,
    metadata: row.metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    integration: integration
      ? {
          id: integration.id,
          provider: integration.provider,
          apiUrl: integration.api_url,
          cloudPhoneId: integration.cloud_phone_id,
          cloudBusinessId: integration.cloud_business_id,
          settings: integration.settings || {},
          hasApiToken: Boolean(integration.api_token_encrypted),
          hasCloudToken: Boolean(integration.cloud_access_token_encrypted),
          maskedApiToken: maskSensitiveValue(integration.api_token_encrypted ? 'token' : null),
          webhookSecret: integration.webhook_secret,
        }
      : null,
  }
}
