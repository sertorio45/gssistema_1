import { createHash, randomBytes } from 'node:crypto'

import { createError } from 'h3'

import { submitApprovalDecision } from '~/server/utils/social-approval-domain'
import { attachApprovalPreviewUrls } from '~/server/utils/social-approval-ux'

/**
 * Magic review links for client approval without full tenant access.
 * Plaintext tokens are returned once at creation; only SHA-256 hashes are stored.
 */

export type ReviewLinkAction = 'approve' | 'changes_requested' | 'reject' | 'comment'
export type ReviewAfterDecision = 'read_only' | 'invalidate'

export const DEFAULT_REVIEW_ACTIONS: ReviewLinkAction[] = [
  'approve',
  'changes_requested',
  'reject',
  'comment',
]

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 30

export function hashReviewToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function generateReviewToken(): { token: string, tokenHash: string } {
  const token = randomBytes(32).toString('base64url')
  return { token, tokenHash: hashReviewToken(token) }
}

export function hashIp(ip: string | null | undefined): string | null {
  if (!ip)
    return null
  return createHash('sha256').update(`review-ip:${ip}`).digest('hex')
}

export interface CreateReviewLinkInput {
  tenantId: string
  organizationId?: string | null
  approvalRequestId: string
  userId: string
  expiresInHours?: number
  maxUses?: number | null
  allowedActions?: ReviewLinkAction[]
  afterDecision?: ReviewAfterDecision
  requireEmailConfirm?: boolean
}

export async function createReviewLink(client: any, input: CreateReviewLinkInput) {
  const { data: request, error } = await client
    .from('approval_requests')
    .select('id, tenant_id, post_id, version_id, status, run_status')
    .eq('tenant_id', input.tenantId)
    .eq('id', input.approvalRequestId)
    .maybeSingle()

  if (error || !request)
    throw createError({ statusCode: 404, statusMessage: 'Solicitação não encontrada' })

  if (String(request.status) !== 'pending' && String(request.run_status) !== 'pending') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Só é possível gerar link para solicitações pendentes',
    })
  }

  if (!request.version_id)
    throw createError({ statusCode: 409, statusMessage: 'Solicitação sem versão vinculada' })

  const { token, tokenHash } = generateReviewToken()
  const expiresInHours = Math.min(Math.max(input.expiresInHours ?? 168, 1), 720)
  const expiresAt = new Date(Date.now() + expiresInHours * 3600_000).toISOString()
  const allowedActions = [...new Set(input.allowedActions?.length
    ? input.allowedActions
    : DEFAULT_REVIEW_ACTIONS)]

  const { data: link, error: insertError } = await client
    .from('social_review_links')
    .insert({
      tenant_id: input.tenantId,
      organization_id: input.organizationId || null,
      approval_request_id: request.id,
      version_id: request.version_id,
      post_id: request.post_id,
      token_hash: tokenHash,
      expires_at: expiresAt,
      max_uses: input.maxUses ?? null,
      allowed_actions: allowedActions,
      after_decision: input.afterDecision || 'read_only',
      require_email_confirm: Boolean(input.requireEmailConfirm),
      created_by: input.userId,
    })
    .select('id, expires_at, allowed_actions, after_decision, require_email_confirm, max_uses')
    .single()

  if (insertError || !link)
    throw createError({ statusCode: 400, statusMessage: insertError?.message || 'Falha ao criar link' })

  return {
    id: String(link.id),
    token,
    path: `/review/${token}`,
    expiresAt: link.expires_at as string,
    allowedActions: link.allowed_actions as ReviewLinkAction[],
    afterDecision: link.after_decision as ReviewAfterDecision,
    requireEmailConfirm: Boolean(link.require_email_confirm),
    maxUses: link.max_uses as number | null,
  }
}

export async function revokeReviewLink(
  client: any,
  input: { tenantId: string, linkId: string, userId: string },
) {
  const { data: link, error } = await client
    .from('social_review_links')
    .select('id, revoked_at')
    .eq('tenant_id', input.tenantId)
    .eq('id', input.linkId)
    .maybeSingle()

  if (error || !link)
    throw createError({ statusCode: 404, statusMessage: 'Link não encontrado' })

  if (link.revoked_at)
    return { id: String(link.id), revoked: true }

  const now = new Date().toISOString()
  const { error: updateError } = await client
    .from('social_review_links')
    .update({ revoked_at: now })
    .eq('tenant_id', input.tenantId)
    .eq('id', input.linkId)

  if (updateError)
    throw createError({ statusCode: 400, statusMessage: updateError.message })

  await recordReviewAccess(client, {
    tenantId: input.tenantId,
    reviewLinkId: String(link.id),
    action: 'revoked',
    ipHash: null,
    userAgent: null,
    metadata: { actorId: input.userId },
  })

  return { id: String(link.id), revoked: true }
}

export async function assertReviewRateLimit(
  client: any,
  input: { reviewLinkId: string, ipHash: string | null },
) {
  if (!input.ipHash)
    return

  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString()
  const { count, error } = await client
    .from('social_review_link_accesses')
    .select('id', { count: 'exact', head: true })
    .eq('review_link_id', input.reviewLinkId)
    .eq('ip_hash', input.ipHash)
    .gte('created_at', since)

  if (error)
    return

  if ((count || 0) >= RATE_LIMIT_MAX) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Muitas tentativas. Aguarde um minuto e tente novamente.',
    })
  }
}

export async function recordReviewAccess(
  client: any,
  input: {
    tenantId: string
    reviewLinkId: string
    action: string
    ipHash: string | null
    userAgent: string | null
    metadata?: Record<string, unknown>
  },
) {
  await client.from('social_review_link_accesses').insert({
    tenant_id: input.tenantId,
    review_link_id: input.reviewLinkId,
    action: input.action,
    ip_hash: input.ipHash,
    user_agent: input.userAgent?.slice(0, 300) || null,
    metadata: input.metadata || {},
  })

  await client
    .from('social_review_links')
    .update({ last_accessed_at: new Date().toISOString() })
    .eq('id', input.reviewLinkId)
}

async function loadActiveReviewLink(client: any, token: string) {
  const tokenHash = hashReviewToken(token)
  const { data: link, error } = await client
    .from('social_review_links')
    .select('*')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (error || !link)
    throw createError({ statusCode: 404, statusMessage: 'Link inválido ou expirado' })

  if (link.revoked_at)
    throw createError({ statusCode: 410, statusMessage: 'Este link foi revogado' })

  if (new Date(link.expires_at).getTime() < Date.now())
    throw createError({ statusCode: 410, statusMessage: 'Este link expirou' })

  if (link.max_uses != null && Number(link.use_count) >= Number(link.max_uses))
    throw createError({ statusCode: 410, statusMessage: 'Este link atingiu o limite de usos' })

  return link
}

function mapDecisionAction(decision: string): ReviewLinkAction {
  if (decision === 'approved')
    return 'approve'
  if (decision === 'rejected')
    return 'reject'
  if (decision === 'changes_requested')
    return 'changes_requested'
  throw createError({ statusCode: 400, statusMessage: 'Decisão inválida' })
}

function isActionAllowed(link: any, action: ReviewLinkAction) {
  const actions = Array.isArray(link.allowed_actions) ? link.allowed_actions : DEFAULT_REVIEW_ACTIONS
  return actions.includes(action)
}

/** Public DTO — no tenant/org/request UUIDs exposed as primary identifiers. */
export async function getPublicReviewPayload(
  client: any,
  input: { token: string, ipHash: string | null, userAgent: string | null },
) {
  const link = await loadActiveReviewLink(client, input.token)
  await assertReviewRateLimit(client, { reviewLinkId: String(link.id), ipHash: input.ipHash })
  await recordReviewAccess(client, {
    tenantId: String(link.tenant_id),
    reviewLinkId: String(link.id),
    action: 'view',
    ipHash: input.ipHash,
    userAgent: input.userAgent,
  })

  const { data: request } = await client
    .from('approval_requests')
    .select(`
      id,
      status,
      run_status,
      stage,
      due_at,
      version_id,
      post_id,
      social_posts (
        id,
        title,
        content,
        scheduled_at,
        timezone
      ),
      content_versions (
        id,
        version,
        snapshot
      )
    `)
    .eq('tenant_id', link.tenant_id)
    .eq('id', link.approval_request_id)
    .maybeSingle()

  if (!request)
    throw createError({ statusCode: 404, statusMessage: 'Solicitação não encontrada' })

  if (String(request.version_id) !== String(link.version_id)) {
    throw createError({
      statusCode: 409,
      statusMessage: 'A versão deste link está desatualizada',
    })
  }

  await attachApprovalPreviewUrls(client, [request])

  const post = Array.isArray(request.social_posts) ? request.social_posts[0] : request.social_posts
  const version = Array.isArray(request.content_versions)
    ? request.content_versions[0]
    : request.content_versions
  const variants = version?.snapshot?.variants || []
  const assets = (version?.snapshot?.assets || [])
    .map((relation: any) => relation.media_assets)
    .filter(Boolean)
    .map((asset: any) => ({
      purpose: asset.purpose || null,
      mime_type: asset.mime_type || null,
      preview_url: asset.preview_url || null,
      width: asset.width || null,
      height: asset.height || null,
      duration_ms: asset.duration_ms || null,
    }))

  const { data: comments } = await client
    .from('social_comments')
    .select(`
      id,
      body,
      created_at,
      visibility,
      anchor_type,
      x_percent,
      y_percent,
      slide_index,
      media_time_ms,
      parent_id
    `)
    .eq('tenant_id', link.tenant_id)
    .eq('post_id', link.post_id)
    .eq('visibility', 'shared')
    .order('created_at', { ascending: true })

  let organizationName: string | null = null
  let organizationLogo: string | null = null
  if (link.organization_id) {
    const { data: org } = await client
      .from('organizations')
      .select('name, settings')
      .eq('id', link.organization_id)
      .maybeSingle()
    organizationName = org?.name || null
    organizationLogo = org?.settings?.branding?.logoUrl || org?.settings?.branding?.logo_url || null
  }

  const pending = String(request.status) === 'pending' || String(request.run_status) === 'pending'
  const readOnly = !pending || Boolean(link.revoked_at)

  return {
    brand: {
      product: 'Blimber',
      organizationName,
      organizationLogo,
    },
    review: {
      status: pending ? 'pending' : String(request.status),
      stage: request.stage || 'client',
      dueAt: request.due_at || null,
      readOnly,
      allowedActions: readOnly
        ? []
        : (Array.isArray(link.allowed_actions) ? link.allowed_actions : DEFAULT_REVIEW_ACTIONS),
      requireEmailConfirm: Boolean(link.require_email_confirm),
      emailConfirmed: Boolean(link.confirmed_email),
    },
    content: {
      title: post?.title || 'Conteúdo para aprovação',
      caption: post?.content || variants[0]?.caption || '',
      hashtags: variants[0]?.hashtags || [],
      cta: variants[0]?.cta || null,
      platforms: [...new Set(variants.map((v: any) => v.platform).filter(Boolean))],
      formats: [...new Set(variants.map((v: any) => v.format).filter(Boolean))],
      scheduledAt: post?.scheduled_at || null,
      timezone: post?.timezone || null,
      versionLabel: version?.version != null ? `v${version.version}` : null,
      assets,
      variants: variants.map((v: any) => ({
        platform: v.platform,
        format: v.format,
        caption: v.caption || null,
        hashtags: v.hashtags || [],
      })),
    },
    comments: (comments || []).map((c: any) => ({
      id: c.id,
      body: c.body,
      createdAt: c.created_at,
      anchorType: c.anchor_type || 'none',
      xPercent: c.x_percent,
      yPercent: c.y_percent,
      slideIndex: c.slide_index,
      mediaTimeMs: c.media_time_ms,
      parentId: c.parent_id,
    })),
  }
}

export async function submitPublicReviewDecision(
  client: any,
  input: {
    token: string
    decision: 'approved' | 'changes_requested' | 'rejected'
    comment?: string | null
    changeCategory?: 'art' | 'copy' | 'date' | 'platform' | 'incorrect_info' | 'other' | null
    actorEmail?: string | null
    ipHash: string | null
    userAgent: string | null
  },
) {
  const link = await loadActiveReviewLink(client, input.token)
  await assertReviewRateLimit(client, { reviewLinkId: String(link.id), ipHash: input.ipHash })

  const action = mapDecisionAction(input.decision)
  if (!isActionAllowed(link, action))
    throw createError({ statusCode: 403, statusMessage: 'Esta ação não está disponível neste link' })

  if (link.require_email_confirm && !link.confirmed_email && !input.actorEmail) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Informe o e-mail para confirmar a decisão',
    })
  }

  const { data: request } = await client
    .from('approval_requests')
    .select('id, version_id, status, run_status')
    .eq('tenant_id', link.tenant_id)
    .eq('id', link.approval_request_id)
    .maybeSingle()

  if (!request)
    throw createError({ statusCode: 404, statusMessage: 'Solicitação não encontrada' })

  if (String(request.version_id) !== String(link.version_id)) {
    throw createError({
      statusCode: 409,
      statusMessage: 'A versão deste link está desatualizada — solicite um novo link',
    })
  }

  // Magic-link decisions are authorized by the link itself. The recorded
  // approver is the link creator (agency operator); actor email lives in audit.
  if (!link.created_by) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Link sem responsável — gere um novo link',
    })
  }

  const commentParts = [
    input.actorEmail ? `[Via link · ${input.actorEmail}]` : '[Via link mágico]',
    input.comment?.trim() || '',
  ].filter(Boolean)

  const result = await submitApprovalDecision(client, {
    tenantId: String(link.tenant_id),
    requestId: String(link.approval_request_id),
    userId: String(link.created_by),
    decision: input.decision,
    comment: commentParts.join(' ') || null,
    changeCategory: input.changeCategory,
    isPlatformAdmin: true,
    capabilities: ['marketing.social.approval.client'],
  })

  await client
    .from('social_review_links')
    .update({
      use_count: Number(link.use_count || 0) + 1,
      confirmed_email: input.actorEmail || link.confirmed_email || null,
      ...(link.after_decision === 'invalidate'
        ? { revoked_at: new Date().toISOString() }
        : {}),
    })
    .eq('id', link.id)

  await recordReviewAccess(client, {
    tenantId: String(link.tenant_id),
    reviewLinkId: String(link.id),
    action: `decision.${input.decision}`,
    ipHash: input.ipHash,
    userAgent: input.userAgent,
    metadata: {
      actorEmail: input.actorEmail || null,
      afterDecision: link.after_decision,
    },
  })

  return {
    status: result.status,
    readOnly: link.after_decision === 'invalidate' || result.status !== 'advanced',
  }
}

export async function submitPublicReviewComment(
  client: any,
  input: {
    token: string
    body: string
    actorEmail?: string | null
    anchor?: CommentAnchorInput | null
    ipHash: string | null
    userAgent: string | null
  },
) {
  const link = await loadActiveReviewLink(client, input.token)
  await assertReviewRateLimit(client, { reviewLinkId: String(link.id), ipHash: input.ipHash })

  if (!isActionAllowed(link, 'comment'))
    throw createError({ statusCode: 403, statusMessage: 'Comentários não estão habilitados neste link' })

  const anchor = normalizeCommentAnchor(input.anchor)
  const { data, error } = await client
    .from('social_comments')
    .insert({
      tenant_id: link.tenant_id,
      post_id: link.post_id,
      version_id: link.version_id,
      author_id: link.created_by,
      body: input.body.trim(),
      visibility: 'shared',
      ...anchorToRow(anchor),
    })
    .select('id, body, created_at, anchor_type, x_percent, y_percent, slide_index, media_time_ms')
    .single()

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  await recordReviewAccess(client, {
    tenantId: String(link.tenant_id),
    reviewLinkId: String(link.id),
    action: 'comment',
    ipHash: input.ipHash,
    userAgent: input.userAgent,
    metadata: { actorEmail: input.actorEmail || null },
  })

  return {
    id: data.id,
    body: data.body,
    createdAt: data.created_at,
    anchorType: data.anchor_type || 'none',
    xPercent: data.x_percent,
    yPercent: data.y_percent,
    slideIndex: data.slide_index,
    mediaTimeMs: data.media_time_ms,
  }
}

// ---------------------------------------------------------------------------
// Comment anchors (shared by auth + public APIs)
// ---------------------------------------------------------------------------

export type CommentAnchorType = 'none' | 'image' | 'carousel' | 'video'

export interface CommentAnchorInput {
  anchorType?: CommentAnchorType
  xPercent?: number | null
  yPercent?: number | null
  slideIndex?: number | null
  mediaTimeMs?: number | null
  assetId?: string | null
}

export function normalizeCommentAnchor(input?: CommentAnchorInput | null) {
  const anchorType = input?.anchorType || 'none'
  const xPercent = input?.xPercent ?? null
  const yPercent = input?.yPercent ?? null
  const slideIndex = input?.slideIndex ?? null
  const mediaTimeMs = input?.mediaTimeMs ?? null
  const assetId = input?.assetId ?? null

  if (anchorType === 'none') {
    return {
      anchorType: 'none' as const,
      xPercent: null,
      yPercent: null,
      slideIndex: null,
      mediaTimeMs: null,
      assetId,
    }
  }

  if (xPercent != null && (xPercent < 0 || xPercent > 100))
    throw createError({ statusCode: 400, statusMessage: 'Posição X inválida' })
  if (yPercent != null && (yPercent < 0 || yPercent > 100))
    throw createError({ statusCode: 400, statusMessage: 'Posição Y inválida' })
  if (slideIndex != null && slideIndex < 0)
    throw createError({ statusCode: 400, statusMessage: 'Slide inválido' })
  if (mediaTimeMs != null && mediaTimeMs < 0)
    throw createError({ statusCode: 400, statusMessage: 'Tempo de mídia inválido' })

  if (anchorType === 'image' && (xPercent == null || yPercent == null))
    throw createError({ statusCode: 400, statusMessage: 'Comentário na imagem exige posição' })

  if (anchorType === 'carousel' && (xPercent == null || yPercent == null || slideIndex == null)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Comentário no carrossel exige posição e slide',
    })
  }

  if (anchorType === 'video' && mediaTimeMs == null)
    throw createError({ statusCode: 400, statusMessage: 'Comentário no vídeo exige o tempo' })

  return {
    anchorType,
    xPercent,
    yPercent,
    slideIndex,
    mediaTimeMs,
    assetId,
  }
}

export function anchorToRow(anchor: ReturnType<typeof normalizeCommentAnchor>) {
  return {
    anchor_type: anchor.anchorType,
    x_percent: anchor.xPercent,
    y_percent: anchor.yPercent,
    slide_index: anchor.slideIndex,
    media_time_ms: anchor.mediaTimeMs,
    asset_id: anchor.assetId,
  }
}
