/**
 * Client briefing magic links — mirror of review links, creates backlog posts on submit.
 */

import { createHash, randomBytes } from 'node:crypto'

import { createError } from 'h3'

import { createSocialNotification } from '~/server/utils/social-audit'

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 30

export const DEFAULT_BRIEFING_FIELDS = [
  { key: 'content_type', label: 'Tipo de conteúdo', type: 'text', required: true },
  { key: 'objective', label: 'Objetivo', type: 'textarea', required: true },
  { key: 'product', label: 'Produto ou serviço', type: 'text', required: false },
  { key: 'promotion', label: 'Promoção', type: 'text', required: false },
  { key: 'price', label: 'Preço', type: 'text', required: false },
  { key: 'period', label: 'Período', type: 'text', required: false },
  { key: 'audience', label: 'Público', type: 'textarea', required: false },
  { key: 'cta', label: 'CTA', type: 'text', required: false },
  { key: 'references', label: 'Referências', type: 'textarea', required: false },
  { key: 'desired_date', label: 'Data desejada', type: 'date', required: false },
  { key: 'notes', label: 'Observações', type: 'textarea', required: false },
] as const

export function hashBriefingToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function generateBriefingToken(): { token: string, tokenHash: string } {
  const token = randomBytes(32).toString('base64url')
  return { token, tokenHash: hashBriefingToken(token) }
}

export function hashBriefingIp(ip: string | null | undefined): string | null {
  if (!ip)
    return null
  return createHash('sha256').update(`briefing-ip:${ip}`).digest('hex')
}

export interface CreateBriefingLinkInput {
  tenantId: string
  organizationId?: string | null
  userId: string
  title?: string
  campaignId?: string | null
  templateId?: string | null
  expiresInHours?: number
  maxUses?: number | null
  requireEmailConfirm?: boolean
}

export async function createBriefingLink(client: any, input: CreateBriefingLinkInput) {
  const { data: briefing, error: briefingError } = await client
    .from('social_briefings')
    .insert({
      tenant_id: input.tenantId,
      organization_id: input.organizationId || null,
      campaign_id: input.campaignId || null,
      template_id: input.templateId || null,
      status: 'awaiting_client',
      title: input.title?.trim() || 'Novo briefing',
      created_by: input.userId,
    })
    .select('id')
    .single()

  if (briefingError || !briefing)
    throw createError({ statusCode: 400, statusMessage: briefingError?.message || 'Falha ao criar briefing' })

  const { token, tokenHash } = generateBriefingToken()
  const expiresInHours = Math.min(Math.max(input.expiresInHours ?? 168, 1), 720)
  const expiresAt = new Date(Date.now() + expiresInHours * 3600_000).toISOString()

  const { data: link, error: linkError } = await client
    .from('social_briefing_links')
    .insert({
      tenant_id: input.tenantId,
      organization_id: input.organizationId || null,
      briefing_id: briefing.id,
      template_id: input.templateId || null,
      campaign_id: input.campaignId || null,
      token_hash: tokenHash,
      expires_at: expiresAt,
      max_uses: input.maxUses ?? 1,
      require_email_confirm: Boolean(input.requireEmailConfirm),
      created_by: input.userId,
    })
    .select('id, expires_at, max_uses, require_email_confirm')
    .single()

  if (linkError || !link)
    throw createError({ statusCode: 400, statusMessage: linkError?.message || 'Falha ao criar link' })

  return {
    id: link.id,
    briefingId: briefing.id,
    token,
    urlPath: `/briefing/${token}`,
    expiresAt: link.expires_at,
    maxUses: link.max_uses,
    requireEmailConfirm: link.require_email_confirm,
  }
}

export async function revokeBriefingLink(client: any, input: {
  tenantId: string
  linkId: string
}) {
  const { data, error } = await client
    .from('social_briefing_links')
    .update({ revoked_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('tenant_id', input.tenantId)
    .eq('id', input.linkId)
    .is('revoked_at', null)
    .select('id')
    .maybeSingle()

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })
  if (!data)
    throw createError({ statusCode: 404, statusMessage: 'Link não encontrado ou já revogado' })
  return data
}

async function assertRateLimit(client: any, linkId: string, ipHash: string | null) {
  if (!ipHash)
    return
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString()
  const { count } = await client
    .from('social_briefing_link_accesses')
    .select('id', { count: 'exact', head: true })
    .eq('briefing_link_id', linkId)
    .eq('ip_hash', ipHash)
    .gte('created_at', since)

  if ((count || 0) >= RATE_LIMIT_MAX) {
    throw createError({ statusCode: 429, statusMessage: 'Muitas tentativas. Aguarde um momento.' })
  }
}

async function loadLinkByToken(client: any, token: string) {
  const tokenHash = hashBriefingToken(token)
  const { data: link, error } = await client
    .from('social_briefing_links')
    .select('*')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (error || !link)
    throw createError({ statusCode: 404, statusMessage: 'Link inválido' })
  if (link.revoked_at)
    throw createError({ statusCode: 410, statusMessage: 'Link revogado' })
  if (new Date(link.expires_at).getTime() < Date.now())
    throw createError({ statusCode: 410, statusMessage: 'Link expirado' })
  if (link.max_uses != null && link.use_count >= link.max_uses) {
    throw createError({ statusCode: 410, statusMessage: 'Link já utilizado' })
  }
  return link
}

export async function getPublicBriefingPayload(client: any, input: {
  token: string
  ip?: string | null
  userAgent?: string | null
}) {
  const link = await loadLinkByToken(client, input.token)
  const ipHash = hashBriefingIp(input.ip)
  await assertRateLimit(client, link.id, ipHash)

  await client.from('social_briefing_link_accesses').insert({
    tenant_id: link.tenant_id,
    briefing_link_id: link.id,
    action: 'view',
    ip_hash: ipHash,
    user_agent: input.userAgent?.slice(0, 300) || null,
  })
  await client
    .from('social_briefing_links')
    .update({ last_accessed_at: new Date().toISOString() })
    .eq('id', link.id)

  const { data: briefing } = await client
    .from('social_briefings')
    .select('id, title, status, payload, needs_info_message, campaign_id')
    .eq('id', link.briefing_id)
    .eq('tenant_id', link.tenant_id)
    .maybeSingle()

  let fields: any[] = [...DEFAULT_BRIEFING_FIELDS]
  if (link.template_id) {
    const { data: template } = await client
      .from('social_briefing_templates')
      .select('fields, name')
      .eq('id', link.template_id)
      .maybeSingle()
    if (Array.isArray(template?.fields) && template.fields.length)
      fields = template.fields
  }

  const { data: tenant } = await client
    .from('tenant')
    .select('name')
    .eq('id', link.tenant_id)
    .maybeSingle()

  let organizationName: string | null = null
  if (link.organization_id) {
    const { data: org } = await client
      .from('organizations')
      .select('name')
      .eq('id', link.organization_id)
      .maybeSingle()
    organizationName = org?.name || null
  }

  const readOnly = ['submitted', 'accepted', 'cancelled'].includes(String(briefing?.status || ''))

  return {
    brand: {
      product: 'Blimber',
      organizationName,
      clientName: tenant?.name || null,
    },
    briefing: {
      id: briefing?.id,
      title: briefing?.title || 'Briefing',
      status: briefing?.status,
      needsInfoMessage: briefing?.needs_info_message || null,
      readOnly,
      requireEmailConfirm: Boolean(link.require_email_confirm),
      fields,
      values: briefing?.payload || {},
    },
  }
}

export async function submitPublicBriefing(client: any, input: {
  token: string
  payload: Record<string, unknown>
  email?: string | null
  ip?: string | null
  userAgent?: string | null
}) {
  const link = await loadLinkByToken(client, input.token)
  const ipHash = hashBriefingIp(input.ip)
  await assertRateLimit(client, link.id, ipHash)

  if (link.require_email_confirm && !(input.email || '').trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Informe seu e-mail' })
  }

  const { data: briefing } = await client
    .from('social_briefings')
    .select('*')
    .eq('id', link.briefing_id)
    .eq('tenant_id', link.tenant_id)
    .maybeSingle()

  if (!briefing)
    throw createError({ statusCode: 404, statusMessage: 'Briefing não encontrado' })
  if (['submitted', 'accepted', 'cancelled'].includes(String(briefing.status))) {
    throw createError({ statusCode: 409, statusMessage: 'Briefing já enviado' })
  }

  const title = String(input.payload.content_type || input.payload.objective || briefing.title || 'Briefing do cliente').slice(0, 180)

  const { data: post, error: postError } = await client
    .from('social_posts')
    .insert({
      tenant_id: link.tenant_id,
      title,
      content: String(input.payload.objective || input.payload.notes || ''),
      created_by: link.created_by,
      campaign_id: link.campaign_id || briefing.campaign_id || null,
      production_status: 'backlog',
      editorial_status: 'draft',
      publication_status: 'not_scheduled',
      metadata: {
        source: 'briefing_link',
        briefing_id: briefing.id,
      },
    })
    .select('id')
    .single()

  if (postError || !post)
    throw createError({ statusCode: 400, statusMessage: postError?.message || 'Falha ao criar conteúdo' })

  // Seed copy + design tasks
  const tasks = [
    { task_type: 'write_copy', title: 'Escrever copy', role_scope: 'copywriter' },
    { task_type: 'create_design', title: 'Criar design', role_scope: 'designer' },
  ]
  for (const task of tasks) {
    await client.from('social_production_tasks').insert({
      tenant_id: link.tenant_id,
      post_id: post.id,
      task_type: task.task_type,
      title: task.title,
      role_scope: task.role_scope,
      status: 'todo',
      priority: 'normal',
      created_by: link.created_by,
    })
  }

  await client
    .from('social_briefings')
    .update({
      status: 'submitted',
      title,
      payload: input.payload,
      client_email: input.email?.trim() || null,
      submitted_at: new Date().toISOString(),
      post_id: post.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', briefing.id)
    .eq('tenant_id', link.tenant_id)

  await client
    .from('social_briefing_links')
    .update({
      use_count: (link.use_count || 0) + 1,
      last_accessed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', link.id)

  await client.from('social_briefing_link_accesses').insert({
    tenant_id: link.tenant_id,
    briefing_link_id: link.id,
    action: 'submit',
    ip_hash: ipHash,
    user_agent: input.userAgent?.slice(0, 300) || null,
    metadata: { post_id: post.id },
  })

  if (link.created_by) {
    await createSocialNotification(client, {
      tenantId: link.tenant_id,
      userId: link.created_by,
      type: 'briefing.submitted',
      title: 'Novo briefing recebido',
      body: title,
      actionUrl: `/marketing/posts/${post.id}`,
      metadata: { briefing_id: briefing.id, post_id: post.id },
    })
  }

  const { emitSocialAutomation } = await import('~/server/utils/social-automations')
  await emitSocialAutomation(client, {
    tenantId: link.tenant_id,
    trigger: 'briefing.submitted',
    actorId: link.created_by,
    postId: post.id,
    entityType: 'social_briefing',
    entityId: briefing.id,
    payload: { briefingId: briefing.id },
  })

  return { postId: post.id, briefingId: briefing.id }
}
