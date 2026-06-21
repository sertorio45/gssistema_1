import { decryptSecret } from '~/server/utils/whatsapp/context'

export interface EvolutionClientConfig {
  baseUrl: string
  apiToken: string
  instanceName: string
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/$/, '')
}

async function evolutionFetch<T>(
  config: EvolutionClientConfig,
  path: string,
  options: { method?: string, body?: unknown } = {},
): Promise<T> {
  const url = `${normalizeBaseUrl(config.baseUrl)}${path}`
  return $fetch<T>(url, {
    method: options.method || 'GET',
    headers: {
      apikey: config.apiToken,
      'Content-Type': 'application/json',
    },
    body: options.body,
  })
}

export async function evolutionCreateInstance(
  config: Omit<EvolutionClientConfig, 'instanceName'> & { instanceName: string },
  webhookUrl?: string,
) {
  const body: Record<string, unknown> = {
    instanceName: config.instanceName,
    qrcode: true,
    integration: 'WHATSAPP-BAILEYS',
  }

  if (webhookUrl) {
    body.webhook = {
      url: webhookUrl,
      enabled: true,
      webhookByEvents: false,
      events: ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'CONNECTION_UPDATE'],
    }
  }

  return evolutionFetch(config, '/instance/create', { method: 'POST', body })
}

export async function evolutionConnect(config: EvolutionClientConfig) {
  return evolutionFetch<{ base64?: string, code?: string, pairingCode?: string }>(
    config,
    `/instance/connect/${encodeURIComponent(config.instanceName)}`,
  )
}

export async function evolutionConnectionState(config: EvolutionClientConfig) {
  return evolutionFetch<{ instance?: { state?: string }, state?: string }>(
    config,
    `/instance/connectionState/${encodeURIComponent(config.instanceName)}`,
  )
}

export async function evolutionLogout(config: EvolutionClientConfig) {
  return evolutionFetch(config, `/instance/logout/${encodeURIComponent(config.instanceName)}`, {
    method: 'DELETE',
  })
}

export async function evolutionDeleteInstance(config: EvolutionClientConfig) {
  return evolutionFetch(config, `/instance/delete/${encodeURIComponent(config.instanceName)}`, {
    method: 'DELETE',
  })
}

export async function evolutionSetWebhook(
  config: EvolutionClientConfig,
  webhookUrl: string,
) {
  return evolutionFetch(config, `/webhook/set/${encodeURIComponent(config.instanceName)}`, {
    method: 'POST',
    body: {
      webhook: {
        url: webhookUrl,
        enabled: true,
        webhookByEvents: false,
        events: ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'CONNECTION_UPDATE'],
      },
    },
  })
}

export async function evolutionSendText(
  config: EvolutionClientConfig,
  payload: { number: string, text: string },
) {
  return evolutionFetch(config, `/message/sendText/${encodeURIComponent(config.instanceName)}`, {
    method: 'POST',
    body: {
      number: payload.number,
      text: payload.text,
    },
  })
}

export async function evolutionSendMedia(
  config: EvolutionClientConfig,
  payload: {
    number: string
    mediatype: 'image' | 'video' | 'audio' | 'document'
    media: string
    caption?: string
    fileName?: string
  },
) {
  return evolutionFetch(config, `/message/sendMedia/${encodeURIComponent(config.instanceName)}`, {
    method: 'POST',
    body: {
      number: payload.number,
      mediatype: payload.mediatype,
      media: payload.media,
      caption: payload.caption || undefined,
      fileName: payload.fileName || undefined,
    },
  })
}

export function getEvolutionConfigFromIntegration(
  integration: Record<string, any>,
  instanceName: string,
): EvolutionClientConfig | null {
  const baseUrl = integration.api_url as string | undefined
  const apiToken = decryptSecret(integration.api_token_encrypted)
  if (!baseUrl || !apiToken)
    return null

  return { baseUrl, apiToken, instanceName }
}

export function mapEvolutionConnectionState(raw: Record<string, unknown>): {
  status: 'disconnected' | 'connecting' | 'connected' | 'error'
  phoneNumber?: string
} {
  const instance = (raw.instance || raw) as Record<string, unknown>
  const state = String(
    instance?.state
    || instance?.status
    || raw.state
    || (raw as any).connection
    || 'close',
  ).toLowerCase()

  const owner = String(instance?.owner || instance?.wuid || (raw as any).phoneNumber || '')
  const phoneNumber = owner
    ? owner.replace(/@.*/, '').replace(/\D/g, '') || undefined
    : undefined

  if (['open', 'connected'].includes(state)) {
    return { status: 'connected', phoneNumber }
  }
  if (['connecting', 'pairing'].includes(state))
    return { status: 'connecting', phoneNumber }

  return { status: 'disconnected', phoneNumber }
}

export interface EvolutionRemoteInstance {
  instanceName: string
  status: string
  phoneNumber?: string | null
  isConnected: boolean
}

function parseEvolutionRemoteInstance(raw: Record<string, unknown>): EvolutionRemoteInstance | null {
  const instance = (raw.instance || raw) as Record<string, unknown>
  const instanceName = String(instance.instanceName || instance.name || '').trim()
  if (!instanceName)
    return null

  const state = String(
    instance.status
    || instance.state
    || raw.state
    || 'close',
  ).toLowerCase()

  const owner = String(instance.owner || instance.number || '')
  const phoneNumber = owner
    ? owner.replace(/@.*/, '').replace(/\D/g, '') || null
    : null

  return {
    instanceName,
    status: state,
    phoneNumber,
    isConnected: ['open', 'connected'].includes(state),
  }
}

export async function evolutionFetchInstances(
  config: Omit<EvolutionClientConfig, 'instanceName'>,
): Promise<EvolutionRemoteInstance[]> {
  const raw = await evolutionFetch<unknown>(
    { ...config, instanceName: '_' },
    '/instance/fetchInstances',
  )

  const list = Array.isArray(raw)
    ? raw
    : (raw as { instances?: unknown[], data?: unknown[] })?.instances
      || (raw as { data?: unknown[] })?.data
      || []

  return list
    .map((item: Record<string, unknown>) => parseEvolutionRemoteInstance(item))
    .filter((item): item is EvolutionRemoteInstance => item !== null)
}

export async function resolveEvolutionRemoteInstance(
  config: Omit<EvolutionClientConfig, 'instanceName'>,
  instanceName: string,
): Promise<EvolutionRemoteInstance> {
  const instances = await evolutionFetchInstances(config)
  const found = instances.find(item => item.instanceName === instanceName)
  if (found)
    return found

  try {
    const raw = await evolutionConnectionState({ ...config, instanceName })
    const mapped = mapEvolutionConnectionState(raw as Record<string, unknown>)
    return {
      instanceName,
      status: mapped.status === 'connected' ? 'open' : mapped.status,
      phoneNumber: mapped.phoneNumber || null,
      isConnected: mapped.status === 'connected',
    }
  }
  catch {
    throw new Error(`Instância "${instanceName}" não encontrada na Evolution API`)
  }
}

export async function syncEvolutionInstanceRecord(
  client: { from: (table: string) => any },
  instanceId: string,
  evoConfig: EvolutionClientConfig,
  options: { currentQrCode?: string | null } = {},
) {
  const raw = await evolutionConnectionState(evoConfig)
  const mapped = mapEvolutionConnectionState(raw as Record<string, unknown>)

  await client
    .from('whatsapp_instance')
    .update({
      status: mapped.status,
      phone_number: mapped.phoneNumber || null,
      connection_state: raw,
      qr_code: mapped.status === 'connected' ? null : options.currentQrCode ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', instanceId)

  return mapped
}
