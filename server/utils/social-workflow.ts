import { createHash } from 'node:crypto'

import { createError } from 'h3'

import { listEligibleSocialApprovers } from '~/server/utils/social-approvers'
import { createSocialNotification } from '~/server/utils/social-audit'

function hashSnapshot(snapshot: Record<string, unknown>) {
  return createHash('sha256').update(JSON.stringify(snapshot)).digest('hex')
}

export async function buildSocialPostSnapshot(
  client: any,
  tenantId: string,
  postId: string,
) {
  const { data: post, error: postError } = await client
    .from('social_posts')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('id', postId)
    .maybeSingle()

  if (postError || !post)
    throw createError({ statusCode: 404, statusMessage: 'Publicação não encontrada' })

  const { data: variants, error: variantError } = await client
    .from('social_post_variants')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('post_id', postId)
    .order('created_at')

  if (variantError)
    throw createError({ statusCode: 400, statusMessage: variantError.message })

  const { data: postAssets, error: assetsError } = await client
    .from('social_post_assets')
    .select('id, variant_id, asset_id, position, media_assets!social_post_assets_asset_id_fkey(id, name, bucket, object_path, mime_type, purpose, metadata)')
    .eq('tenant_id', tenantId)
    .eq('post_id', postId)
    .order('position')

  if (assetsError)
    throw createError({ statusCode: 400, statusMessage: assetsError.message })

  return {
    post: {
      id: post.id,
      title: post.title,
      content: post.content,
      scheduled_at: post.scheduled_at,
      timezone: post.timezone,
      approval_policy: post.approval_policy,
      minimum_approvals: post.minimum_approvals,
    },
    variants: variants || [],
    assets: postAssets || [],
  }
}

export async function createContentVersion(
  client: any,
  tenantId: string,
  postId: string,
  userId: string,
) {
  const snapshot = await buildSocialPostSnapshot(client, tenantId, postId)

  const { data: latest } = await client
    .from('content_versions')
    .select('version')
    .eq('tenant_id', tenantId)
    .eq('post_id', postId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  const version = Number(latest?.version || 0) + 1
  const { data, error } = await client
    .from('content_versions')
    .insert({
      tenant_id: tenantId,
      post_id: postId,
      version,
      snapshot,
      checksum: hashSnapshot(snapshot),
      created_by: userId,
    })
    .select('*')
    .single()

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  await client
    .from('social_posts')
    .update({ current_version: version })
    .eq('tenant_id', tenantId)
    .eq('id', postId)

  return data
}

export async function submitPostForApproval(
  client: any,
  input: {
    tenantId: string
    postId: string
    userId: string
    approverIds: string[]
    dueAt?: string | null
  },
) {
  const uniqueApproverIds = [...new Set(input.approverIds.filter(Boolean))]
  if (!uniqueApproverIds.length)
    throw createError({ statusCode: 400, statusMessage: 'Selecione ao menos um aprovador' })

  const eligibleApprovers = await listEligibleSocialApprovers(client, input.tenantId)
  const allowedApprovers = new Set(eligibleApprovers.map(approver => approver.userId))
  if (uniqueApproverIds.some(userId => !allowedApprovers.has(userId))) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Um dos usuários selecionados não possui permissão para aprovar',
    })
  }

  const { data: post, error: postError } = await client
    .from('social_posts')
    .select('id, title, status, approval_policy, minimum_approvals')
    .eq('tenant_id', input.tenantId)
    .eq('id', input.postId)
    .maybeSingle()

  if (postError || !post)
    throw createError({ statusCode: 404, statusMessage: 'Publicação não encontrada' })
  if (!['draft', 'changes_requested', 'approved', 'failed'].includes(post.status))
    throw createError({ statusCode: 409, statusMessage: 'Publicação não pode ser enviada neste estado' })

  const { data: variants } = await client
    .from('social_post_variants')
    .select('id, format')
    .eq('tenant_id', input.tenantId)
    .eq('post_id', input.postId)
  if (!variants?.length)
    throw createError({ statusCode: 400, statusMessage: 'Selecione ao menos uma rede social' })

  const { data: publicationAssets } = await client
    .from('social_post_assets')
    .select('variant_id')
    .eq('tenant_id', input.tenantId)
    .eq('post_id', input.postId)
    .not('variant_id', 'is', null)
  const assetCountByVariant = new Map<string, number>()
  for (const relation of publicationAssets || []) {
    assetCountByVariant.set(
      relation.variant_id,
      (assetCountByVariant.get(relation.variant_id) || 0) + 1,
    )
  }
  for (const variant of variants) {
    const assetCount = assetCountByVariant.get(variant.id) || 0
    const minimumAssets = variant.format === 'carousel' ? 2 : 1
    if (assetCount < minimumAssets) {
      throw createError({
        statusCode: 400,
        statusMessage: variant.format === 'carousel'
          ? 'Cada carrossel precisa de pelo menos duas peças'
          : 'Cada canal precisa de uma peça final',
      })
    }
  }

  const version = await createContentVersion(client, input.tenantId, input.postId, input.userId)
  const minimumApprovals = post.approval_policy === 'minimum'
    ? Math.min(Number(post.minimum_approvals), uniqueApproverIds.length)
    : 1

  const { data: request, error: requestError } = await client
    .from('approval_requests')
    .insert({
      tenant_id: input.tenantId,
      post_id: input.postId,
      version_id: version.id,
      status: 'pending',
      policy: post.approval_policy,
      minimum_approvals: minimumApprovals,
      requested_by: input.userId,
      due_at: input.dueAt || null,
    })
    .select('*')
    .single()

  if (requestError)
    throw createError({ statusCode: 400, statusMessage: requestError.message })

  const { error: approverError } = await client
    .from('approval_request_approvers')
    .insert(uniqueApproverIds.map(userId => ({
      tenant_id: input.tenantId,
      request_id: request.id,
      user_id: userId,
    })))

  if (approverError) {
    await client.from('approval_requests').delete().eq('id', request.id)
    throw createError({ statusCode: 400, statusMessage: approverError.message })
  }

  await client
    .from('social_posts')
    .update({
      status: 'pending_approval',
      approved_version_id: null,
    })
    .eq('tenant_id', input.tenantId)
    .eq('id', input.postId)

  await Promise.all(uniqueApproverIds.map(userId => createSocialNotification(client, {
    tenantId: input.tenantId,
    userId,
    type: 'approval_requested',
    title: 'Nova arte para aprovação',
    body: `${post.title} aguarda sua decisão.`,
    actionUrl: `/marketing/approvals?request=${request.id}`,
    metadata: { postId: input.postId, requestId: request.id },
  })))

  return request
}

export async function decideApproval(
  client: any,
  input: {
    tenantId: string
    requestId: string
    userId: string
    decision: 'approved' | 'changes_requested'
    comment?: string | null
    /** Platform superadmin may decide even when not pre-selected as approver. */
    isPlatformAdmin?: boolean
  },
) {
  const { data: request, error: requestError } = await client
    .from('approval_requests')
    .select('*, social_posts!approval_requests_post_id_fkey(id, title, created_by)')
    .eq('tenant_id', input.tenantId)
    .eq('id', input.requestId)
    .maybeSingle()

  if (requestError || !request)
    throw createError({ statusCode: 404, statusMessage: 'Solicitação não encontrada' })
  if (request.status !== 'pending')
    throw createError({ statusCode: 409, statusMessage: 'Esta solicitação já foi encerrada' })

  const { data: approver } = await client
    .from('approval_request_approvers')
    .select('id')
    .eq('request_id', input.requestId)
    .eq('user_id', input.userId)
    .maybeSingle()

  if (!approver) {
    if (!input.isPlatformAdmin) {
      throw createError({ statusCode: 403, statusMessage: 'Você não é aprovador desta solicitação' })
    }

    // Superadmin can intervene on any pending request without prior assignment.
    const { error: insertApproverError } = await client
      .from('approval_request_approvers')
      .insert({
        tenant_id: input.tenantId,
        request_id: input.requestId,
        user_id: input.userId,
      })
    if (insertApproverError)
      throw createError({ statusCode: 400, statusMessage: insertApproverError.message })
  }

  const { error: decisionError } = await client
    .from('approval_decisions')
    .upsert({
      tenant_id: input.tenantId,
      request_id: input.requestId,
      approver_id: input.userId,
      decision: input.decision,
      comment: input.comment?.trim() || null,
    }, { onConflict: 'request_id,approver_id' })

  if (decisionError)
    throw createError({ statusCode: 400, statusMessage: decisionError.message })

  const { data: decisions } = await client
    .from('approval_decisions')
    .select('decision')
    .eq('request_id', input.requestId)

  const approvedCount = (decisions || []).filter((row: any) => row.decision === 'approved').length
  const hasChanges = (decisions || []).some((row: any) => row.decision === 'changes_requested')
  const { count: approverCount } = await client
    .from('approval_request_approvers')
    .select('id', { count: 'exact', head: true })
    .eq('request_id', input.requestId)

  const isApproved = input.isPlatformAdmin
    ? input.decision === 'approved'
    : request.policy === 'all'
      ? approvedCount >= Number(approverCount || 0)
      : request.policy === 'minimum'
        ? approvedCount >= Number(request.minimum_approvals)
        : approvedCount >= 1

  let resolvedStatus: 'pending' | 'approved' | 'changes_requested' = 'pending'
  if (input.isPlatformAdmin)
    resolvedStatus = input.decision
  else if (hasChanges)
    resolvedStatus = 'changes_requested'
  else if (isApproved)
    resolvedStatus = 'approved'

  if (resolvedStatus !== 'pending') {
    await client
      .from('approval_requests')
      .update({ status: resolvedStatus, resolved_at: new Date().toISOString() })
      .eq('id', input.requestId)

    await client
      .from('social_posts')
      .update({
        status: resolvedStatus === 'approved' ? 'approved' : 'changes_requested',
        approved_version_id: resolvedStatus === 'approved' ? request.version_id : null,
      })
      .eq('tenant_id', input.tenantId)
      .eq('id', request.post_id)

    const post = Array.isArray(request.social_posts) ? request.social_posts[0] : request.social_posts
    if (post?.created_by) {
      await createSocialNotification(client, {
        tenantId: input.tenantId,
        userId: post.created_by,
        type: resolvedStatus,
        title: resolvedStatus === 'approved' ? 'Arte aprovada' : 'Ajustes solicitados',
        body: `${post.title} recebeu uma nova decisão.`,
        actionUrl: `/marketing/production/${request.post_id}`,
        metadata: { postId: request.post_id, requestId: request.id },
      })
    }
  }

  return { status: resolvedStatus, approvedCount, approverCount: approverCount || 0 }
}

export async function enqueueApprovedPost(
  client: any,
  input: {
    tenantId: string
    postId: string
    scheduledAt?: string | null
  },
) {
  const { data: post, error: postError } = await client
    .from('social_posts')
    .select('id, status, approved_version_id, scheduled_at')
    .eq('tenant_id', input.tenantId)
    .eq('id', input.postId)
    .maybeSingle()

  if (postError || !post)
    throw createError({ statusCode: 404, statusMessage: 'Publicação não encontrada' })
  if (post.status !== 'approved' || !post.approved_version_id)
    throw createError({ statusCode: 409, statusMessage: 'A versão atual ainda não foi aprovada' })

  const scheduledAt = input.scheduledAt || post.scheduled_at || new Date().toISOString()
  const { data: variants, error: variantsError } = await client
    .from('social_post_variants')
    .select('id, account_id')
    .eq('tenant_id', input.tenantId)
    .eq('post_id', input.postId)

  if (variantsError || !variants?.length)
    throw createError({ statusCode: 400, statusMessage: 'Adicione ao menos um canal de publicação' })

  const rows = variants.map((variant: { id: string, account_id: string }) => ({
    tenant_id: input.tenantId,
    post_id: input.postId,
    variant_id: variant.id,
    version_id: post.approved_version_id,
    account_id: variant.account_id,
    scheduled_at: scheduledAt,
    idempotency_key: `${input.postId}:${post.approved_version_id}:${variant.id}`,
  }))

  const { data: jobs, error: jobsError } = await client
    .from('publication_jobs')
    .upsert(rows, { onConflict: 'idempotency_key', ignoreDuplicates: true })
    .select('*')

  if (jobsError)
    throw createError({ statusCode: 400, statusMessage: jobsError.message })

  await client
    .from('social_posts')
    .update({ status: 'scheduled', scheduled_at: scheduledAt })
    .eq('tenant_id', input.tenantId)
    .eq('id', input.postId)

  return jobs || []
}
