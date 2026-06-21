import type { SupabaseClient } from '@supabase/supabase-js'

import type { WhatsAppGeneralSettings, WhatsAppLlmSettings } from '~/types/whatsapp'

const KEY_GENERAL = 'general'
const KEY_LLM = 'llm'

export async function getWhatsAppSetting<T>(
  client: SupabaseClient,
  tenantId: string,
  key: string,
  fallback: T,
): Promise<T> {
  const { data } = await client
    .from('whatsapp_setting')
    .select('value')
    .eq('tenant_id', tenantId)
    .eq('key', key)
    .maybeSingle()

  return { ...fallback, ...((data?.value || {}) as T) }
}

export async function upsertWhatsAppSetting<T extends Record<string, unknown>>(
  client: SupabaseClient,
  tenantId: string,
  key: string,
  value: T,
): Promise<T> {
  const { data: existing } = await client
    .from('whatsapp_setting')
    .select('id, value')
    .eq('tenant_id', tenantId)
    .eq('key', key)
    .maybeSingle()

  const merged = { ...((existing?.value || {}) as T), ...value }
  const now = new Date().toISOString()

  if (existing?.id) {
    await client
      .from('whatsapp_setting')
      .update({ value: merged, updated_at: now })
      .eq('id', existing.id)
  }
  else {
    await client
      .from('whatsapp_setting')
      .insert({ tenant_id: tenantId, key, value: merged })
  }

  return merged
}

export function getDefaultGeneralSettings(): WhatsAppGeneralSettings {
  return {
    welcome_message: '',
    auto_resolve_hours: 0,
    default_priority: 0,
    business_hours_enabled: false,
    business_hours_start: '09:00',
    business_hours_end: '18:00',
    business_hours_timezone: 'America/Sao_Paulo',
    notify_new_conversation: true,
  }
}

export function getDefaultLlmSettings(): WhatsAppLlmSettings {
  return {
    default_provider: 'ollama',
    default_model: process.env.OLLAMA_DEFAULT_MODEL || 'qwen',
  }
}

export async function getWhatsAppModuleSettings(
  client: SupabaseClient,
  tenantId: string,
): Promise<{ general: WhatsAppGeneralSettings, llm: WhatsAppLlmSettings }> {
  const [general, llm] = await Promise.all([
    getWhatsAppSetting(client, tenantId, KEY_GENERAL, getDefaultGeneralSettings()),
    getWhatsAppSetting(client, tenantId, KEY_LLM, getDefaultLlmSettings()),
  ])

  return { general, llm }
}

export async function saveWhatsAppGeneralSettings(
  client: SupabaseClient,
  tenantId: string,
  value: Partial<WhatsAppGeneralSettings>,
): Promise<WhatsAppGeneralSettings> {
  return upsertWhatsAppSetting(client, tenantId, KEY_GENERAL, value)
}

export async function saveWhatsAppLlmSettings(
  client: SupabaseClient,
  tenantId: string,
  value: Partial<WhatsAppLlmSettings>,
): Promise<WhatsAppLlmSettings> {
  return upsertWhatsAppSetting(client, tenantId, KEY_LLM, value)
}
