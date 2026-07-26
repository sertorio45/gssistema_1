import type { NormalizedRemoteDeleteResult, RemoteDeletionStatus } from '~/server/utils/social-publishers/meta-delete'

import { createError } from 'h3'
import { holdsCapability } from '~/constants/workspace'
import {
  deleteMetaRemoteObject,

} from '~/server/utils/social-publishers/meta-delete'

export type SocialDeletionMode
  = | 'cancel_draft'
    | 'system_and_remote'
    | 'system_only'
    | 'retry_remote'

export interface DeletionRequestInput {
  tenantId: string
  postId: string
  userId: string
  mode: SocialDeletionMode
  reason?: string | null
  confirmRemoteDeletion?: boolean
  confirmLocalOnly?: boolean
  forceCompleteLocal?: boolean
  manualConfirmations?: Array<{ variantId: string, confirmed: boolean }>
  capabilities: Iterable<string>
  isPlatformStaff?: boolean
  lockOwner?: string
}

export interface DeletionPlatformResult extends NormalizedRemoteDeleteResult {
  variantId: string | null
  accountId: string | null
  jobId?: string | null
}

export interface DeletionOutcome {
  mode: SocialDeletionMode
  overallStatus: 'completed' | 'partial' | 'failed' | 'manual_action_required' | 'pending'
  localDeleted: boolean
  remoteDeletionStatus: string
  platforms: DeletionPlatformResult[]
  deleted: DeletionPlatformResult[]
  alreadyAbsent: DeletionPlatformResult[]
  failed: DeletionPlatformResult[]
  manualActions: DeletionPlatformResult[]
  canRetry: boolean
  canForceLocal: boolean
}

function hasCap(capabilities: Iterable<string>, capability: string, isPlatformStaff?: boolean) {
  if (isPlatformStaff)
    return true
  return holdsCapability(capabilities, capability)
}

export function assertDeletionCapabilities(input: DeletionRequestInput) {
  const { mode, capabilities, isPlatformStaff, forceCompleteLocal } = input

  if (mode === 'cancel_draft' || mode === 'system_only') {
    if (!hasCap(capabilities, 'marketing.social.delete.local', isPlatformStaff)) {
      throw createError({ statusCode: 403, statusMessage: 'Sem permissão para exclusão local' })
    }
  }

  if (mode === 'system_and_remote' || mode === 'retry_remote') {
    if (!hasCap(capabilities, 'marketing.social.delete.remote', isPlatformStaff)) {
      throw createError({ statusCode: 403, statusMessage: 'Sem permissão para exclusão remota' })
    }
    if (mode === 'system_and_remote' && !hasCap(capabilities, 'marketing.social.delete.local', isPlatformStaff)) {
      throw createError({ statusCode: 403, statusMessage: 'Sem permissão para concluir exclusão local' })
    }
  }

  if (mode === 'retry_remote' && !hasCap(capabilities, 'marketing.social.delete.retry', isPlatformStaff)) {
    throw createError({ statusCode: 403, statusMessage: 'Sem permissão para repetir exclusão remota' })
  }

  if (forceCompleteLocal && !hasCap(capabilities, 'marketing.social.delete.force', isPlatformStaff)) {
    throw createError({ statusCode: 403, statusMessage: 'Sem permissão para forçar exclusão local' })
  }
}

function isNeverPublished(post: any, variants: any[]) {
  const publication = String(post.publication_status || '')
  const status = String(post.status || '')
  const hasRemote = variants.some(v => v.external_post_id || v.external_media_id)
  if (hasRemote)
    return false
  return ['not_scheduled', 'scheduled'].includes(publication)
    || ['draft', 'pending_approval', 'changes_requested', 'approved', 'scheduled'].includes(status)
}

function idempotencyKey(postId: string, variantId: string, objectId: string | null) {
  return `delete:${postId}:${variantId}:${objectId || 'none'}`
}

async function lockPost(client: any, input: DeletionRequestInput) {
  const { data, error } = await client.rpc('lock_social_post_for_deletion', {
    p_tenant_id: input.tenantId,
    p_post_id: input.postId,
    p_locked_by: input.lockOwner || input.userId,
    p_lock_ttl_seconds: 120,
  })

  if (error) {
    const message = String(error.message || '')
    if (message.includes('social_post_not_found'))
      throw createError({ statusCode: 404, statusMessage: 'Publicação não encontrada' })
    if (message.includes('social_post_already_deleted'))
      throw createError({ statusCode: 409, statusMessage: 'Publicação já excluída' })
    if (message.includes('social_post_deletion_locked'))
      throw createError({ statusCode: 409, statusMessage: 'Exclusão já em andamento por outro processo' })
    if (message.includes('social_post_publishing_in_progress')) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Há publicação em andamento. Aguarde o término ou cancele o job antes de excluir.',
      })
    }
    throw createError({ statusCode: 400, statusMessage: message })
  }

  return Array.isArray(data) ? data[0] : data
}

async function cancelPendingPublicationJobs(client: any, tenantId: string, postId: string) {
  await client
    .from('publication_jobs')
    .update({
      status: 'failed',
      last_error_code: 'deletion_cancelled',
      last_error_message: 'Job cancelado porque a publicação entrou em exclusão',
      locked_at: null,
      locked_by: null,
    })
    .eq('tenant_id', tenantId)
    .eq('post_id', postId)
    .in('status', ['pending', 'retrying'])
}

async function loadVariants(client: any, tenantId: string, postId: string) {
  const { data, error } = await client
    .from('social_post_variants')
    .select(`
      id, platform, format, account_id,
      external_post_id, external_post_url, external_object_type,
      external_container_id, external_media_id, external_permalink, remote_identifiers,
      social_accounts!social_post_variants_account_id_fkey (
        id, platform, provider, external_account_id, name, is_active
      )
    `)
    .eq('tenant_id', tenantId)
    .eq('post_id', postId)

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })
  return data || []
}

async function upsertDeletionJob(
  client: any,
  input: {
    tenantId: string
    postId: string
    variant: any
    objectId: string | null
    status?: RemoteDeletionStatus
  },
) {
  const key = idempotencyKey(input.postId, input.variant.id, input.objectId)
  const payload = {
    tenant_id: input.tenantId,
    post_id: input.postId,
    variant_id: input.variant.id,
    account_id: input.variant.account_id,
    platform: input.variant.platform,
    format: input.variant.format,
    external_object_id: input.objectId,
    external_object_type: input.variant.external_object_type,
    external_permalink: input.variant.external_permalink || input.variant.external_post_url,
    idempotency_key: key,
    status: input.status || 'pending',
    updated_at: new Date().toISOString(),
  }

  const { data: existing } = await client
    .from('deletion_jobs')
    .select('*')
    .eq('tenant_id', input.tenantId)
    .eq('idempotency_key', key)
    .maybeSingle()

  if (existing) {
    // Terminal successes stay as-is (idempotent).
    if (['deleted', 'already_absent', 'skipped', 'done'].includes(existing.status))
      return existing
    const { data } = await client
      .from('deletion_jobs')
      .update(payload)
      .eq('id', existing.id)
      .select('*')
      .maybeSingle()
    return data || existing
  }

  const { data, error } = await client
    .from('deletion_jobs')
    .insert(payload)
    .select('*')
    .maybeSingle()

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })
  return data
}

async function markJobResult(client: any, jobId: string, result: NormalizedRemoteDeleteResult, attempts: number) {
  const terminalDeleted = result.status === 'deleted' || result.status === 'already_absent'
  await client.from('deletion_jobs').update({
    status: result.status === 'deleted' ? 'deleted' : result.status,
    attempts,
    last_error_code: result.providerCode,
    last_error_message: result.message,
    provider_code: result.providerCode,
    provider_message: result.message,
    response_summary: {
      status: result.status,
      deleted: result.deleted,
      objectType: result.objectType,
      // Never persist tokens — only sanitized fields.
    },
    retryable: result.retryable,
    manual_action_required: result.manualActionRequired,
    external_permalink: result.permalink || null,
    last_attempt_at: new Date().toISOString(),
    deleted_at: terminalDeleted ? new Date().toISOString() : null,
    next_attempt_at: result.retryable
      ? new Date(Date.now() + Math.min(60, 2 ** Math.max(0, attempts - 1)) * 60_000).toISOString()
      : null,
    locked_at: null,
    locked_by: null,
    updated_at: new Date().toISOString(),
  }).eq('id', jobId)
}

function mapJobToPlatformResult(job: any, result?: NormalizedRemoteDeleteResult): DeletionPlatformResult {
  if (result) {
    return {
      ...result,
      variantId: job.variant_id,
      accountId: job.account_id,
      jobId: job.id,
    }
  }
  return {
    platform: job.platform || 'unknown',
    format: job.format || null,
    externalObjectId: job.external_object_id,
    objectType: (job.external_object_type || 'unknown') as any,
    status: job.status,
    deleted: ['deleted', 'already_absent', 'done'].includes(job.status),
    retryable: Boolean(job.retryable),
    manualActionRequired: Boolean(job.manual_action_required),
    providerCode: job.provider_code,
    message: job.provider_message || job.last_error_message,
    permalink: job.external_permalink,
    variantId: job.variant_id,
    accountId: job.account_id,
    jobId: job.id,
  }
}

async function runRemoteDeletes(
  client: any,
  input: DeletionRequestInput,
  variants: any[],
  options: { retryFailedOnly: boolean },
): Promise<DeletionPlatformResult[]> {
  const results: DeletionPlatformResult[] = []
  const manualSet = new Set(
    (input.manualConfirmations || [])
      .filter(item => item.confirmed)
      .map(item => item.variantId),
  )

  for (const variant of variants) {
    const account = Array.isArray(variant.social_accounts)
      ? variant.social_accounts[0]
      : variant.social_accounts

    const objectId = variant.external_media_id || variant.external_post_id || null
    if (!objectId) {
      results.push({
        platform: variant.platform,
        format: variant.format,
        externalObjectId: null,
        objectType: 'unknown',
        status: 'skipped',
        deleted: true,
        retryable: false,
        manualActionRequired: false,
        providerCode: 'no_remote_object',
        message: 'Variante sem publicação remota',
        variantId: variant.id,
        accountId: variant.account_id,
      })
      continue
    }

    const job = await upsertDeletionJob(client, {
      tenantId: input.tenantId,
      postId: input.postId,
      variant,
      objectId,
    })

    if (options.retryFailedOnly && ['deleted', 'already_absent', 'done', 'skipped'].includes(job.status)) {
      results.push(mapJobToPlatformResult(job))
      continue
    }

    if (manualSet.has(variant.id) && (job.manual_action_required || job.status === 'manual_action_required' || job.status === 'unsupported')) {
      await client.from('deletion_jobs').update({
        status: 'deleted',
        manual_confirmed_at: new Date().toISOString(),
        manual_confirmed_by: input.userId,
        deleted_at: new Date().toISOString(),
        provider_message: 'Remoção manual confirmada pelo usuário',
        updated_at: new Date().toISOString(),
      }).eq('id', job.id)
      results.push({
        platform: variant.platform,
        format: variant.format,
        externalObjectId: objectId,
        objectType: (variant.external_object_type || 'unknown') as any,
        status: 'deleted',
        deleted: true,
        retryable: false,
        manualActionRequired: false,
        providerCode: 'manual_confirmed',
        message: 'Remoção manual confirmada',
        permalink: variant.external_permalink || variant.external_post_url,
        variantId: variant.id,
        accountId: variant.account_id,
        jobId: job.id,
      })
      continue
    }

    if (!account || account.provider !== 'meta') {
      const unsupported: NormalizedRemoteDeleteResult = {
        platform: variant.platform,
        format: variant.format,
        externalObjectId: objectId,
        objectType: 'unknown',
        status: 'unsupported',
        deleted: false,
        retryable: false,
        manualActionRequired: true,
        providerCode: 'provider_unsupported',
        message: 'Exclusão remota não suportada neste provedor',
        permalink: variant.external_permalink || variant.external_post_url,
      }
      await markJobResult(client, job.id, unsupported, Number(job.attempts || 0) + 1)
      results.push(mapJobToPlatformResult(job, unsupported))
      continue
    }

    await client.from('deletion_jobs').update({
      status: 'processing',
      locked_at: new Date().toISOString(),
      locked_by: input.lockOwner || input.userId,
      attempts: Number(job.attempts || 0) + 1,
      updated_at: new Date().toISOString(),
    }).eq('id', job.id)

    const remote = await deleteMetaRemoteObject({
      client,
      tenantId: input.tenantId,
      account,
      format: variant.format,
      externalPostId: variant.external_post_id,
      externalObjectType: variant.external_object_type,
      externalContainerId: variant.external_container_id,
      externalMediaId: variant.external_media_id,
      externalPermalink: variant.external_permalink || variant.external_post_url,
      remoteIdentifiers: variant.remote_identifiers,
    })

    await markJobResult(client, job.id, remote, Number(job.attempts || 0) + 1)

    await client.from('social_post_variants').update({
      external_deletion_status: remote.status,
    }).eq('id', variant.id)

    results.push({
      ...remote,
      variantId: variant.id,
      accountId: variant.account_id,
      jobId: job.id,
    })
  }

  return results
}

function summarize(results: DeletionPlatformResult[]): Omit<DeletionOutcome, 'mode' | 'localDeleted' | 'remoteDeletionStatus'> {
  const deleted = results.filter(r => r.status === 'deleted' || r.status === 'already_absent' || r.status === 'skipped')
  const alreadyAbsent = results.filter(r => r.status === 'already_absent')
  const failed = results.filter(r => r.status === 'failed')
  const manualActions = results.filter(r => r.status === 'manual_action_required' || r.status === 'unsupported')
  const pending = results.filter(r => r.status === 'pending' || r.status === 'processing')

  let overallStatus: DeletionOutcome['overallStatus'] = 'completed'
  if (manualActions.length && failed.length)
    overallStatus = 'partial'
  else if (manualActions.length)
    overallStatus = 'manual_action_required'
  else if (failed.length && deleted.length)
    overallStatus = 'partial'
  else if (failed.length)
    overallStatus = 'failed'
  else if (pending.length)
    overallStatus = 'pending'

  return {
    overallStatus,
    platforms: results,
    deleted,
    alreadyAbsent,
    failed,
    manualActions,
    canRetry: failed.some(r => r.retryable) || manualActions.length > 0,
    canForceLocal: failed.length > 0 || manualActions.length > 0,
  }
}

async function finalizeLocal(
  client: any,
  input: DeletionRequestInput,
  remoteStatus: string,
) {
  const { data, error } = await client.rpc('marketing_delete_social_post', {
    p_tenant_id: input.tenantId,
    p_post_id: input.postId,
    p_deleted_by: input.userId,
    p_mode: input.mode === 'retry_remote' ? 'system_and_remote' : input.mode,
    p_reason: input.reason || null,
    p_remote_status: remoteStatus,
  })
  if (error || !data)
    throw createError({ statusCode: 400, statusMessage: error?.message || 'Não foi possível concluir exclusão local' })
}

/**
 * Orchestrates the four deletion modes with capability checks, locking,
 * per-variant remote attempts and soft-delete tombstone.
 */
export async function executeSocialPostDeletion(
  client: any,
  input: DeletionRequestInput,
): Promise<DeletionOutcome> {
  assertDeletionCapabilities(input)

  const { data: post, error: postError } = await client
    .from('social_posts')
    .select('*')
    .eq('tenant_id', input.tenantId)
    .eq('id', input.postId)
    .maybeSingle()

  if (postError || !post)
    throw createError({ statusCode: 404, statusMessage: 'Publicação não encontrada' })

  // Cross-tenant attempts are rejected by the tenant filter above.
  if (post.tenant_id !== input.tenantId)
    throw createError({ statusCode: 403, statusMessage: 'Publicação de outro tenant' })

  const variants = await loadVariants(client, input.tenantId, input.postId)
  const neverPublished = isNeverPublished(post, variants)

  if (input.mode === 'system_only') {
    if (!input.confirmLocalOnly) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Confirme que o conteúdo permanecerá nas redes (confirmLocalOnly)',
      })
    }
    if (!input.reason?.trim()) {
      throw createError({ statusCode: 400, statusMessage: 'Informe o motivo da exclusão somente local' })
    }
  }

  if (input.mode === 'system_and_remote' && !neverPublished && !input.confirmRemoteDeletion) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Confirme a exclusão nas redes (confirmRemoteDeletion)',
    })
  }

  if (input.mode === 'cancel_draft' && !neverPublished) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Este post já possui publicação remota — use system_and_remote ou system_only',
    })
  }

  await lockPost(client, input)
  await cancelPendingPublicationJobs(client, input.tenantId, input.postId)

  // Abort if a publication job is mid-flight (processing lock still held).
  const { count: processingCount } = await client
    .from('publication_jobs')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', input.tenantId)
    .eq('post_id', input.postId)
    .eq('status', 'processing')

  if (processingCount && processingCount > 0) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Há job de publicação em processamento. Tente novamente em instantes.',
    })
  }

  if (input.mode === 'cancel_draft' || (input.mode === 'system_only')) {
    await finalizeLocal(client, input, input.mode === 'system_only' ? 'skipped' : 'not_applicable')
    return {
      mode: input.mode,
      overallStatus: 'completed',
      localDeleted: true,
      remoteDeletionStatus: input.mode === 'system_only' ? 'skipped' : 'not_applicable',
      platforms: [],
      deleted: [],
      alreadyAbsent: [],
      failed: [],
      manualActions: [],
      canRetry: false,
      canForceLocal: false,
    }
  }

  await client.from('social_posts').update({
    deletion_status: 'remote_in_progress',
    remote_deletion_status: 'in_progress',
    deletion_mode: input.mode === 'retry_remote' ? 'system_and_remote' : input.mode,
    deletion_reason: input.reason || post.deletion_reason,
    updated_at: new Date().toISOString(),
  }).eq('id', input.postId).eq('tenant_id', input.tenantId)

  const remoteVariants = variants.filter((v: any) => v.external_post_id || v.external_media_id)
  const platformResults = await runRemoteDeletes(client, input, remoteVariants, {
    retryFailedOnly: input.mode === 'retry_remote',
  })

  const summary = summarize(platformResults)
  const allRemoteOk = summary.failed.length === 0 && summary.manualActions.length === 0

  let localDeleted = false
  let remoteDeletionStatus = 'partial'
  let overallStatus: DeletionOutcome['overallStatus'] = summary.overallStatus

  if (allRemoteOk) {
    remoteDeletionStatus = summary.manualActions.length ? 'manual_action_required' : 'completed'
    await finalizeLocal(client, input, remoteDeletionStatus)
    localDeleted = true
    overallStatus = 'completed'
  }
  else if (input.forceCompleteLocal) {
    assertDeletionCapabilities({ ...input, forceCompleteLocal: true })
    remoteDeletionStatus = summary.failed.length ? 'failed' : 'partial'
    await finalizeLocal(client, { ...input, mode: 'system_and_remote' }, remoteDeletionStatus)
    localDeleted = true
    overallStatus = 'partial'
  }
  else {
    remoteDeletionStatus = summary.overallStatus === 'failed' ? 'failed' : 'partial'
    await client.from('social_posts').update({
      deletion_status: 'remote_partial',
      remote_deletion_status: remoteDeletionStatus,
      deletion_locked_at: null,
      deletion_locked_by: null,
      updated_at: new Date().toISOString(),
    }).eq('id', input.postId).eq('tenant_id', input.tenantId)
  }

  return {
    mode: input.mode,
    overallStatus,
    localDeleted,
    remoteDeletionStatus,
    platforms: summary.platforms,
    deleted: summary.deleted,
    alreadyAbsent: summary.alreadyAbsent,
    failed: summary.failed,
    manualActions: summary.manualActions,
    canRetry: summary.canRetry,
    canForceLocal: summary.canForceLocal,
  }
}
