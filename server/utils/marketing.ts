import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { createError, getHeader, getQuery } from 'h3'

import { isStaffUser, resolveStaffRole } from '~/server/utils/tenant-role'

const KEY_SEPARATOR = ':'

type TenantRole = 'admin' | 'funcionario' | 'cliente' | string | null

function isUuid(value?: string | null) {
  if (!value)
    return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function getEncryptionKey() {
  const secret
    = process.env.MARKETING_ENCRYPTION_SECRET
      || process.env.DASHBOARD_ENCRYPTION_SECRET
      || process.env.SUPABASE_SERVICE_KEY
      || process.env.SUPABASE_KEY
      || 'marketing-fallback-secret'
  return createHash('sha256').update(secret).digest()
}

export function encryptSecret(value: string) {
  const key = getEncryptionKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('base64')}${KEY_SEPARATOR}${tag.toString('base64')}${KEY_SEPARATOR}${encrypted.toString('base64')}`
}

export function decryptSecret(value?: string | null) {
  if (!value)
    return null

  const [ivB64, tagB64, encryptedB64] = value.split(KEY_SEPARATOR)
  if (!ivB64 || !tagB64 || !encryptedB64)
    return null

  const key = getEncryptionKey()
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedB64, 'base64')),
    decipher.final(),
  ])
  return decrypted.toString('utf8')
}

export async function resolveMarketingTenantContext(event: any, requestedTenantId?: string) {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const headerTenant = event ? getHeader(event, 'X-Tenant-Id')?.trim() : undefined
  const queryTenant = event
    ? (getQuery(event).tenant_id as string | undefined)?.trim()
    : undefined
  const effectiveRequested = requestedTenantId?.trim() || headerTenant || queryTenant || undefined

  const tenantRoles = (user.app_metadata as any)?.tenant_roles || {}
  let fallbackTenantId = event.context.auth?.tenantId || Object.keys(tenantRoles)[0] || null
  if (fallbackTenantId && !isUuid(fallbackTenantId)) {
    const client = await serverSupabaseServiceRole(event)
    const { data: tenantBySlug } = await client
      .from('tenant')
      .select('id')
      .eq('slug', fallbackTenantId)
      .maybeSingle()
    if (tenantBySlug?.id) {
      fallbackTenantId = tenantBySlug.id
    }
  }
  let normalizedRequestedTenantId = effectiveRequested || null

  if (normalizedRequestedTenantId && !isUuid(normalizedRequestedTenantId)) {
    const client = await serverSupabaseServiceRole(event)
    const { data: tenantBySlug } = await client
      .from('tenant')
      .select('id')
      .eq('slug', normalizedRequestedTenantId)
      .maybeSingle()

    if (tenantBySlug?.id) {
      normalizedRequestedTenantId = tenantBySlug.id
    }
  }

  const tenantId = normalizedRequestedTenantId || fallbackTenantId

  if (!tenantId) {
    throw createError({ statusCode: 400, statusMessage: 'Tenant ID is required' })
  }

  let role: TenantRole = (tenantRoles[tenantId] as TenantRole) || null
  if (!role) {
    const client = await serverSupabaseServiceRole(event)
    const { data: tenantRow } = await client
      .from('tenant')
      .select('slug')
      .eq('id', tenantId)
      .maybeSingle()
    if (tenantRow?.slug && tenantRoles[tenantRow.slug]) {
      role = tenantRoles[tenantRow.slug] as TenantRole
    }
  }
  if (!role) {
    role = (user.user_metadata as any)?.role || (user.app_metadata as any)?.role || null
  }

  if (!role && isStaffUser(user)) {
    role = resolveStaffRole(user)
  }

  if (!role) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  if (role === 'cliente' && normalizedRequestedTenantId) {
    const allowedKeys = new Set(
      [
        ...Object.keys(tenantRoles || {}),
        String((user.user_metadata as any)?.tenant_id || ''),
        String((user.app_metadata as any)?.tenant_id || ''),
        String(fallbackTenantId || ''),
      ].filter(Boolean),
    )
    const client = await serverSupabaseServiceRole(event)
    const { data: tenantRow } = await client
      .from('tenant')
      .select('slug')
      .eq('id', normalizedRequestedTenantId)
      .maybeSingle()
    const slugForRequested = tenantRow?.slug
    const hasTenantAccess
      = allowedKeys.has(normalizedRequestedTenantId)
        || (slugForRequested && allowedKeys.has(slugForRequested))
    if (!hasTenantAccess) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }
  }

  return { user, tenantId, role }
}

export function maskSensitiveValue(value?: string | null) {
  if (!value)
    return null
  if (value.length <= 6)
    return '******'
  return `${value.slice(0, 2)}******${value.slice(-2)}`
}

export async function getCachedMarketingData(
  client: any,
  tenantId: string,
  provider: 'google' | 'meta' | 'all',
  cacheKey: string,
) {
  const { data } = await client
    .from('marketing_campaign_cache')
    .select('payload, expires_at')
    .eq('tenant_id', tenantId)
    .eq('provider', provider)
    .eq('cache_key', cacheKey)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  return data?.payload ?? null
}

export async function setCachedMarketingData(
  client: any,
  tenantId: string,
  provider: 'google' | 'meta' | 'all',
  cacheKey: string,
  payload: any,
  ttlMinutes = 30,
) {
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString()
  await client
    .from('marketing_campaign_cache')
    .upsert(
      {
        tenant_id: tenantId,
        provider,
        cache_key: cacheKey,
        payload,
        expires_at: expiresAt,
      },
      { onConflict: 'tenant_id,provider,cache_key' },
    )
}

function fingerprintToken(enc?: string | null) {
  if (!enc)
    return '0'
  return createHash('sha256').update(enc).digest('hex').slice(0, 16)
}

export function buildMarketingOverviewCacheKey(
  source: string,
  googleTemplate: string,
  periodKey: string,
  metaAdsActiveOnly: boolean,
  integrationRows: Array<{ provider: string, config?: Record<string, any> | null, updated_at?: string | null }>,
) {
  const meta = integrationRows.find(r => r.provider === 'meta')
  const google = integrationRows.find(r => r.provider === 'google_ads' || r.provider === 'google')
  const metaEnc = meta?.config?.access_token_enc as string | undefined
  const googleEnc = google?.config?.access_token_enc as string | undefined
  const metaPart = meta
    ? `m:${meta.updated_at || ''}:${meta.config?.ad_account_id || ''}:${fingerprintToken(metaEnc)}`
    : 'm:none'
  const googlePart = google
    ? `g:${google.updated_at || ''}:${google.config?.customer_id || ''}:${fingerprintToken(googleEnc)}`
    : 'g:none'
  const ads = metaAdsActiveOnly ? 'ads1' : 'ads0'
  return `${source}:${googleTemplate}:${periodKey}:${ads}:${metaPart}:${googlePart}`
}

export async function clearMarketingCampaignCacheForTenant(client: any, tenantId: string) {
  await client.from('marketing_campaign_cache').delete().eq('tenant_id', tenantId)
}
