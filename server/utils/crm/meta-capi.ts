import type { H3Event } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createHash, randomUUID } from 'node:crypto'
import process from 'node:process'

import { decryptSecret } from '~/server/utils/marketing'
import { formatBrazilianMobilePhone, normalizePhone } from '~/server/utils/whatsapp/contact-utils'

export type MetaCapiEventName = 'Lead' | 'Purchase'
export type MetaCapiEventStatus = 'pending' | 'processing' | 'sent' | 'failed' | 'skipped'
export type MetaCapiActionSource =
  | 'website'
  | 'chat'
  | 'business_messaging'
  | 'phone_call'
  | 'email'
  | 'other'
  | 'system_generated'

const MAX_ATTEMPTS = 5
const RETRY_DELAYS_MS = [60_000, 5 * 60_000, 30 * 60_000, 2 * 60 * 60_000, 6 * 60 * 60_000] as const

interface MetaIntegrationConfig {
  pixel_id?: string
  capi_enabled?: boolean
  capi_access_token_enc?: string
  capi_test_event_code?: string
}

interface LeadRow {
  id: string
  tenant_id: string
  name: string | null
  source: string | null
  value: number | null
  status: string | null
  closed_at: string | null
  created_at: string | null
  meta_lead_id: string | null
  fbc: string | null
  fbp: string | null
  fbclid: string | null
}

interface ContactPii {
  email: string | null
  phone: string | null
}

export interface MetaCapiSettings {
  enabled: boolean
  pixel_id: string | null
  has_token: boolean
  test_event_code: string | null
  meta_connected: boolean
}

function graphVersion() {
  return process.env.META_GRAPH_VERSION || 'v21.0'
}

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

function normalizeEmail(email?: string | null) {
  const value = String(email || '').trim().toLowerCase()
  if (!value || value.includes('@blimber.local'))
    return null
  return value
}

function normalizePhoneForMeta(phone?: string | null) {
  const e164 = formatBrazilianMobilePhone(phone)
  if (e164)
    return e164
  const digits = normalizePhone(String(phone || ''))
  if (digits.length < 10)
    return null
  return digits.startsWith('55') ? digits : `55${digits}`
}

function buildFbc(fbclid?: string | null, existingFbc?: string | null) {
  if (existingFbc)
    return existingFbc
  const clickId = String(fbclid || '').trim()
  if (!clickId)
    return null
  return `fb.1.${Math.floor(Date.now() / 1000)}.${clickId}`
}

export function resolveMetaActionSource(input: {
  source?: string | null
  metaLeadId?: string | null
  hasWhatsapp?: boolean
}): MetaCapiActionSource {
  if (input.metaLeadId)
    return 'system_generated'
  if (input.hasWhatsapp || input.source === 'phone')
    return 'business_messaging'
  if (input.source === 'website' || input.source === 'social')
    return 'website'
  if (input.source === 'email')
    return 'email'
  if (input.source === 'referral')
    return 'other'
  return 'system_generated'
}

function nextAttemptAt(attempts: number) {
  const delay = RETRY_DELAYS_MS[Math.min(attempts, RETRY_DELAYS_MS.length - 1)]
  return new Date(Date.now() + delay).toISOString()
}

async function loadMetaIntegration(
  client: SupabaseClient,
  tenantId: string,
): Promise<{ id: string, config: MetaIntegrationConfig, isActive: boolean } | null> {
  const { data } = await client
    .from('marketing_integrations')
    .select('id, config, is_active')
    .eq('tenant_id', tenantId)
    .eq('provider', 'meta')
    .maybeSingle()

  if (!data?.id)
    return null

  return {
    id: data.id as string,
    config: (data.config || {}) as MetaIntegrationConfig,
    isActive: Boolean(data.is_active),
  }
}

export async function getMetaCapiSettings(
  client: SupabaseClient,
  tenantId: string,
): Promise<MetaCapiSettings> {
  const integration = await loadMetaIntegration(client, tenantId)
  const config = integration?.config || {}
  const pixelId = config.pixel_id ? String(config.pixel_id) : null
  const hasToken = Boolean(decryptSecret(config.capi_access_token_enc))

  return {
    enabled: Boolean(config.capi_enabled),
    pixel_id: pixelId,
    has_token: hasToken,
    test_event_code: config.capi_test_event_code ? String(config.capi_test_event_code) : null,
    /** CAPI does not require Marketing OAuth — Pixel + token from Events Manager is enough. */
    meta_connected: Boolean(pixelId && hasToken),
  }
}

async function resolveLeadPii(
  client: SupabaseClient,
  tenantId: string,
  leadId: string,
): Promise<ContactPii & { hasWhatsapp: boolean }> {
  const [{ data: contacts }, { data: conversation }] = await Promise.all([
    client
      .from('crm_contact')
      .select('email, phone')
      .eq('tenant_id', tenantId)
      .eq('lead_id', leadId)
      .limit(5),
    client
      .from('whatsapp_conversation')
      .select('contact_phone')
      .eq('tenant_id', tenantId)
      .eq('lead_id', leadId)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle(),
  ])

  const contactEmail = (contacts || []).map(c => normalizeEmail(c.email)).find(Boolean) || null
  const contactPhone = (contacts || []).map(c => c.phone).find(p => normalizePhoneForMeta(p)) || null
  const waPhone = conversation?.contact_phone || null

  return {
    email: contactEmail,
    phone: contactPhone || waPhone,
    hasWhatsapp: Boolean(waPhone),
  }
}

function buildUserData(input: {
  email?: string | null
  phone?: string | null
  name?: string | null
  fbc?: string | null
  fbp?: string | null
  metaLeadId?: string | null
}) {
  const userData: Record<string, unknown> = {}
  const email = normalizeEmail(input.email)
  const phone = normalizePhoneForMeta(input.phone)

  if (email)
    userData.em = [sha256(email)]
  if (phone)
    userData.ph = [sha256(phone)]

  const firstName = String(input.name || '').trim().split(/\s+/)[0]
  if (firstName)
    userData.fn = [sha256(firstName.toLowerCase())]

  const fbc = buildFbc(null, input.fbc)
  if (fbc)
    userData.fbc = fbc
  if (input.fbp)
    userData.fbp = input.fbp
  if (input.metaLeadId)
    userData.lead_id = input.metaLeadId

  return userData
}

function hasMinimumMatchData(userData: Record<string, unknown>) {
  return Boolean(userData.em || userData.ph || userData.lead_id || userData.fbc)
}

async function fetchLeadRow(
  client: SupabaseClient,
  tenantId: string,
  leadId: string,
): Promise<LeadRow | null> {
  const { data } = await client
    .from('crm_lead')
    .select('id, tenant_id, name, source, value, status, closed_at, created_at, meta_lead_id, fbc, fbp, fbclid')
    .eq('id', leadId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  return (data as LeadRow | null) || null
}

export async function enqueueMetaConversion(
  client: SupabaseClient,
  input: {
    tenantId: string
    leadId: string
    eventName: MetaCapiEventName
    eventTime?: string | null
    force?: boolean
  },
): Promise<{ enqueued: boolean, reason?: string, eventRowId?: string }> {
  const settings = await getMetaCapiSettings(client, input.tenantId)
  if (!settings.enabled)
    return { enqueued: false, reason: 'capi_disabled' }
  if (!settings.pixel_id || !settings.has_token)
    return { enqueued: false, reason: 'capi_not_configured' }

  const { data: existing } = await client
    .from('crm_meta_conversion_events')
    .select('id, status, event_id')
    .eq('tenant_id', input.tenantId)
    .eq('lead_id', input.leadId)
    .eq('event_name', input.eventName)
    .maybeSingle()

  if (existing?.status === 'sent' && !input.force)
    return { enqueued: false, reason: 'already_sent', eventRowId: existing.id as string }

  const lead = await fetchLeadRow(client, input.tenantId, input.leadId)
  if (!lead)
    return { enqueued: false, reason: 'lead_not_found' }

  const pii = await resolveLeadPii(client, input.tenantId, input.leadId)
  const actionSource = resolveMetaActionSource({
    source: lead.source,
    metaLeadId: lead.meta_lead_id,
    hasWhatsapp: pii.hasWhatsapp,
  })
  const eventTime = input.eventTime
    || (input.eventName === 'Purchase' ? lead.closed_at : lead.created_at)
    || new Date().toISOString()

  const fbc = buildFbc(lead.fbclid, lead.fbc)
  const userData = buildUserData({
    email: pii.email,
    phone: pii.phone,
    name: lead.name,
    fbc,
    fbp: lead.fbp,
    metaLeadId: lead.meta_lead_id,
  })

  if (!hasMinimumMatchData(userData)) {
    const skipPayload = {
      event_name: input.eventName,
      action_source: actionSource,
      skip_reason: 'missing_pii',
    }
    const { data: skipped } = await client
      .from('crm_meta_conversion_events')
      .upsert({
        tenant_id: input.tenantId,
        lead_id: input.leadId,
        event_name: input.eventName,
        event_id: existing?.event_id || randomUUID(),
        event_time: eventTime,
        action_source: actionSource,
        status: 'skipped',
        attempts: 0,
        next_attempt_at: new Date().toISOString(),
        last_error: 'Lead sem e-mail, telefone ou meta_lead_id para matching',
        payload_snapshot: skipPayload,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'tenant_id,lead_id,event_name' })
      .select('id')
      .single()

    return { enqueued: false, reason: 'missing_pii', eventRowId: skipped?.id as string }
  }

  const eventId = input.force ? randomUUID() : (existing?.event_id as string || randomUUID())
  const { data: row, error } = await client
    .from('crm_meta_conversion_events')
    .upsert({
      tenant_id: input.tenantId,
      lead_id: input.leadId,
      event_name: input.eventName,
      event_id: eventId,
      event_time: eventTime,
      action_source: actionSource,
      status: 'pending',
      attempts: 0,
      next_attempt_at: new Date().toISOString(),
      last_error: null,
      payload_snapshot: null,
      meta_response: null,
      sent_at: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'tenant_id,lead_id,event_name' })
    .select('id')
    .single()

  if (error)
    throw error

  return { enqueued: true, eventRowId: row.id as string }
}

async function sendEventToMeta(input: {
  pixelId: string
  accessToken: string
  testEventCode?: string | null
  event: {
    event_name: string
    event_time: number
    event_id: string
    action_source: string
    user_data: Record<string, unknown>
    custom_data?: Record<string, unknown>
  }
}) {
  const body: Record<string, unknown> = {
    data: [input.event],
    access_token: input.accessToken,
  }
  if (input.testEventCode)
    body.test_event_code = input.testEventCode

  return await $fetch<Record<string, unknown>>(
    `https://graph.facebook.com/${graphVersion()}/${input.pixelId}/events`,
    {
      method: 'POST',
      body,
    },
  )
}

async function processSingleEvent(
  client: SupabaseClient,
  row: {
    id: string
    tenant_id: string
    lead_id: string
    event_name: MetaCapiEventName
    event_id: string
    event_time: string
    action_source: string
    attempts: number
  },
  integration: { config: MetaIntegrationConfig },
) {
  const pixelId = String(integration.config.pixel_id || '')
  const accessToken = decryptSecret(integration.config.capi_access_token_enc)
  if (!pixelId || !accessToken) {
    await client.from('crm_meta_conversion_events').update({
      status: 'failed',
      last_error: 'Pixel ou token CAPI não configurados',
      next_attempt_at: nextAttemptAt(row.attempts),
      attempts: row.attempts + 1,
      updated_at: new Date().toISOString(),
    }).eq('id', row.id)
    return { ok: false }
  }

  const lead = await fetchLeadRow(client, row.tenant_id, row.lead_id)
  if (!lead) {
    await client.from('crm_meta_conversion_events').update({
      status: 'skipped',
      last_error: 'Lead removido',
      updated_at: new Date().toISOString(),
    }).eq('id', row.id)
    return { ok: false }
  }

  const pii = await resolveLeadPii(client, row.tenant_id, row.lead_id)
  const fbc = buildFbc(lead.fbclid, lead.fbc)
  const userData = buildUserData({
    email: pii.email,
    phone: pii.phone,
    name: lead.name,
    fbc,
    fbp: lead.fbp,
    metaLeadId: lead.meta_lead_id,
  })

  if (!hasMinimumMatchData(userData)) {
    await client.from('crm_meta_conversion_events').update({
      status: 'skipped',
      last_error: 'Lead sem e-mail, telefone ou meta_lead_id para matching',
      payload_snapshot: { skip_reason: 'missing_pii' },
      updated_at: new Date().toISOString(),
    }).eq('id', row.id)
    return { ok: false }
  }

  const eventTimeUnix = Math.floor(new Date(row.event_time).getTime() / 1000)
  const customData: Record<string, unknown> = {
    lead_event_source: 'GS Sistema CRM',
    event_source: 'crm',
  }
  if (row.event_name === 'Purchase') {
    customData.currency = 'BRL'
    customData.value = Number(lead.value || 0)
  }

  const payloadEvent = {
    event_name: row.event_name,
    event_time: eventTimeUnix,
    event_id: row.event_id,
    action_source: row.action_source,
    user_data: userData,
    custom_data: customData,
  }

  try {
    const response = await sendEventToMeta({
      pixelId,
      accessToken,
      testEventCode: integration.config.capi_test_event_code,
      event: payloadEvent,
    })

    await client.from('crm_meta_conversion_events').update({
      status: 'sent',
      attempts: row.attempts + 1,
      last_error: null,
      payload_snapshot: payloadEvent,
      meta_response: response,
      sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', row.id)

    return { ok: true }
  }
  catch (error: any) {
    const attempts = row.attempts + 1
    const failedPermanently = attempts >= MAX_ATTEMPTS
    const message = error?.data?.error?.message
      || error?.statusMessage
      || error?.message
      || 'Falha ao enviar evento para a Meta'

    await client.from('crm_meta_conversion_events').update({
      status: failedPermanently ? 'failed' : 'pending',
      attempts,
      last_error: String(message).slice(0, 500),
      payload_snapshot: payloadEvent,
      next_attempt_at: failedPermanently
        ? new Date().toISOString()
        : nextAttemptAt(attempts),
      updated_at: new Date().toISOString(),
    }).eq('id', row.id)

    return { ok: false }
  }
}

export async function processMetaConversionQueue(
  client: SupabaseClient,
  input: { tenantId?: string, limit?: number } = {},
) {
  const limit = Math.min(Math.max(input.limit || 20, 1), 100)
  const nowIso = new Date().toISOString()

  let query = client
    .from('crm_meta_conversion_events')
    .select('id, tenant_id, lead_id, event_name, event_id, event_time, action_source, attempts, status')
    .eq('status', 'pending')
    .lte('next_attempt_at', nowIso)
    .lt('attempts', MAX_ATTEMPTS)
    .order('next_attempt_at', { ascending: true })
    .limit(limit)

  if (input.tenantId)
    query = query.eq('tenant_id', input.tenantId)

  const { data: rows, error } = await query
  if (error)
    throw error

  let processed = 0
  let sent = 0
  const integrationCache = new Map<string, { config: MetaIntegrationConfig } | null>()

  for (const row of rows || []) {
    let integration = integrationCache.get(row.tenant_id)
    if (integration === undefined) {
      const loaded = await loadMetaIntegration(client, row.tenant_id)
      integration = loaded
        ? { config: loaded.config }
        : null
      integrationCache.set(row.tenant_id, integration)
    }

    if (!integration || !integration.config.capi_enabled) {
      await client.from('crm_meta_conversion_events').update({
        status: 'skipped',
        last_error: 'CAPI desativado para o tenant',
        updated_at: new Date().toISOString(),
      }).eq('id', row.id)
      continue
    }

    await client.from('crm_meta_conversion_events').update({
      status: 'processing',
      updated_at: new Date().toISOString(),
    }).eq('id', row.id)

    const result = await processSingleEvent(client, {
      id: row.id as string,
      tenant_id: row.tenant_id as string,
      lead_id: row.lead_id as string,
      event_name: row.event_name as MetaCapiEventName,
      event_id: row.event_id as string,
      event_time: row.event_time as string,
      action_source: row.action_source as string,
      attempts: Number(row.attempts || 0),
    }, integration)

    processed += 1
    if (result.ok)
      sent += 1
  }

  return { processed, sent }
}

export function scheduleMetaCapiProcessing(
  event: H3Event | null,
  client: SupabaseClient,
  tenantId: string,
) {
  const run = () => processMetaConversionQueue(client, { tenantId, limit: 10 }).catch(() => {})

  const waitUntil = (event as any)?.waitUntil as ((p: Promise<unknown>) => void) | undefined
  if (typeof waitUntil === 'function') {
    waitUntil(Promise.resolve().then(run))
    return
  }

  void run()
}

export async function syncPendingWonPurchases(
  client: SupabaseClient,
  input: { tenantId: string, limit?: number, force?: boolean },
) {
  const limit = Math.min(Math.max(input.limit || 50, 1), 100)

  const { data: stages } = await client
    .from('crm_sales_stage')
    .select('id, name, funnel_id, tenant_id')

  const wonStageIds = new Set(
    (stages || [])
      .filter((stage) => {
        const name = String(stage.name || '').toLowerCase()
        return name.includes('ganh') || name.includes('won')
      })
      .map(stage => stage.id as string),
  )

  const { data: alreadySent } = await client
    .from('crm_meta_conversion_events')
    .select('lead_id')
    .eq('tenant_id', input.tenantId)
    .eq('event_name', 'Purchase')
    .eq('status', 'sent')

  const sentLeadIds = new Set((alreadySent || []).map(row => row.lead_id as string))

  const { data: leads } = await client
    .from('crm_lead')
    .select('id, status, sales_stage_id, closed_at')
    .eq('tenant_id', input.tenantId)
    .order('closed_at', { ascending: false, nullsFirst: false })
    .limit(limit * 3)

  const candidates = (leads || []).filter((lead) => {
    const isWon = lead.status === 'won'
      || (lead.sales_stage_id && wonStageIds.has(lead.sales_stage_id as string))
    if (!isWon)
      return false
    if (!input.force && sentLeadIds.has(lead.id as string))
      return false
    return true
  }).slice(0, limit)

  let enqueued = 0
  for (const lead of candidates) {
    const result = await enqueueMetaConversion(client, {
      tenantId: input.tenantId,
      leadId: lead.id as string,
      eventName: 'Purchase',
      eventTime: lead.closed_at as string | null,
      force: input.force,
    })
    if (result.enqueued)
      enqueued += 1
  }

  return { candidates: candidates.length, enqueued }
}

export async function sendMetaCapiTestEvent(
  client: SupabaseClient,
  tenantId: string,
) {
  const integration = await loadMetaIntegration(client, tenantId)
  if (!integration)
    throw createErrorLike(400, 'Salve o Pixel e o token da API de Conversões antes de testar')

  const pixelId = String(integration.config.pixel_id || '')
  const accessToken = decryptSecret(integration.config.capi_access_token_enc)
  const testCode = integration.config.capi_test_event_code

  if (!pixelId)
    throw createErrorLike(400, 'Informe o ID do Pixel')
  if (!accessToken)
    throw createErrorLike(400, 'Informe o token da API de Conversões')
  if (!testCode)
    throw createErrorLike(400, 'Informe o código de teste do Events Manager (TEST...)')

  const eventId = randomUUID()
  const response = await sendEventToMeta({
    pixelId,
    accessToken,
    testEventCode: testCode,
    event: {
      event_name: 'Lead',
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      action_source: 'system_generated',
      user_data: {
        em: [sha256('test@example.com')],
        ph: [sha256('5511999999999')],
      },
      custom_data: {
        lead_event_source: 'GS Sistema CRM',
        event_source: 'crm',
        test: true,
      },
    },
  })

  return { eventId, response }
}

export async function countPendingWonPurchases(
  client: SupabaseClient,
  tenantId: string,
) {
  const { data: stages } = await client
    .from('crm_sales_stage')
    .select('id, name')

  const wonStageIds = new Set(
    (stages || [])
      .filter((stage) => {
        const name = String(stage.name || '').toLowerCase()
        return name.includes('ganh') || name.includes('won')
      })
      .map(stage => stage.id as string),
  )

  const { data: sent } = await client
    .from('crm_meta_conversion_events')
    .select('lead_id')
    .eq('tenant_id', tenantId)
    .eq('event_name', 'Purchase')
    .eq('status', 'sent')

  const sentIds = new Set((sent || []).map(r => r.lead_id as string))

  const { data: leads } = await client
    .from('crm_lead')
    .select('id, status, sales_stage_id')
    .eq('tenant_id', tenantId)

  const pending = (leads || []).filter((lead) => {
    const isWon = lead.status === 'won'
      || (lead.sales_stage_id && wonStageIds.has(lead.sales_stage_id as string))
    return isWon && !sentIds.has(lead.id as string)
  })

  return pending.length
}

export async function attachMetaCapiStatusToLeads(
  client: SupabaseClient,
  tenantId: string,
  leadIds: string[],
) {
  const map = new Map<string, { status: MetaCapiEventStatus, event_name: string, last_error: string | null }>()
  if (!leadIds.length)
    return map

  const { data } = await client
    .from('crm_meta_conversion_events')
    .select('lead_id, status, event_name, last_error, updated_at')
    .eq('tenant_id', tenantId)
    .in('lead_id', leadIds)
    .order('updated_at', { ascending: false })

  for (const row of data || []) {
    const leadId = row.lead_id as string
    // Prefer Purchase status when both exist
    const current = map.get(leadId)
    if (!current || row.event_name === 'Purchase') {
      map.set(leadId, {
        status: row.status as MetaCapiEventStatus,
        event_name: row.event_name as string,
        last_error: row.last_error as string | null,
      })
    }
  }

  return map
}

function createErrorLike(statusCode: number, statusMessage: string) {
  const error = new Error(statusMessage) as Error & { statusCode: number, statusMessage: string }
  error.statusCode = statusCode
  error.statusMessage = statusMessage
  return error
}
