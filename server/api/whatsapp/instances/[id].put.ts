import { createError, readBody } from 'h3'

import {
  buildEvolutionWebhookUrl,
  encryptSecret,
  resolveWhatsAppTenantContext,
} from '~/server/utils/whatsapp/context'
import {
  evolutionSetWebhook,
  getEvolutionConfigFromIntegration,
  resolveEvolutionRemoteInstance,
  syncEvolutionInstanceRecord,
} from '~/server/utils/whatsapp/evolution-client'
import { getEvolutionInstanceName, loadInstanceWithIntegration } from '~/server/utils/whatsapp/instance-loader'

interface UpdateInstanceBody {
  tenant_id?: string
  name?: string
  is_default?: boolean
  evolution_instance_name?: string
  api_url?: string
  api_token?: string
  cloud_phone_id?: string
  cloud_business_id?: string
  cloud_access_token?: string
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, statusMessage: 'id is required' })

  const body = await readBody<UpdateInstanceBody>(event)
  const { tenantId } = await resolveWhatsAppTenantContext(event, body.tenant_id)

  const { client, instance, integration } = await loadInstanceWithIntegration(event, id)
  if (instance.tenant_id !== tenantId)
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  if (body.name?.trim()) {
    await client
      .from('whatsapp_instance')
      .update({ name: body.name.trim(), updated_at: new Date().toISOString() })
      .eq('id', id)
  }

  if (body.evolution_instance_name?.trim() && instance.provider === 'evolution') {
    const metadata = {
      ...(instance.metadata || {}),
      evolution_instance_name: body.evolution_instance_name.trim(),
      evolution_link_existing: true,
    }
    await client
      .from('whatsapp_instance')
      .update({ metadata, updated_at: new Date().toISOString() })
      .eq('id', id)
    instance.metadata = metadata
  }

  if (body.is_default === true) {
    await client.from('whatsapp_instance').update({ is_default: false }).eq('tenant_id', tenantId)
    await client.from('whatsapp_instance').update({ is_default: true }).eq('id', id)
  }

  const integrationUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.api_url?.trim())
    integrationUpdate.api_url = body.api_url.trim()
  if (body.api_token?.trim())
    integrationUpdate.api_token_encrypted = encryptSecret(body.api_token.trim())
  if (body.cloud_phone_id?.trim())
    integrationUpdate.cloud_phone_id = body.cloud_phone_id.trim()
  if (body.cloud_business_id !== undefined)
    integrationUpdate.cloud_business_id = body.cloud_business_id?.trim() || null
  if (body.cloud_access_token?.trim())
    integrationUpdate.cloud_access_token_encrypted = encryptSecret(body.cloud_access_token.trim())

  if (integration && Object.keys(integrationUpdate).length > 1) {
    await client.from('whatsapp_integration').update(integrationUpdate).eq('instance_id', id)
  }

  const { data: updatedIntegration } = await client
    .from('whatsapp_integration')
    .select('*')
    .eq('instance_id', id)
    .maybeSingle()

  if (
    instance.provider === 'evolution'
    && updatedIntegration
    && (body.evolution_instance_name?.trim() || body.api_url?.trim() || body.api_token?.trim())
  ) {
    const evoConfig = getEvolutionConfigFromIntegration(
      updatedIntegration,
      getEvolutionInstanceName({ ...instance, metadata: instance.metadata }),
    )
    if (evoConfig) {
      const webhookUrl = buildEvolutionWebhookUrl(event, id)
      try {
        await evolutionSetWebhook(evoConfig, webhookUrl)
        await resolveEvolutionRemoteInstance(
          { baseUrl: evoConfig.baseUrl, apiToken: evoConfig.apiToken },
          evoConfig.instanceName,
        )
        await syncEvolutionInstanceRecord(client, id, evoConfig)
      }
      catch {
        /* validation/sync is best-effort on update */
      }
    }
  }

  const { data: updated } = await client.from('whatsapp_instance').select('*').eq('id', id).single()

  return { data: updated, integration: updatedIntegration }
})
