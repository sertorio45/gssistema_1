/**
 * Operational production Kanban — independent from editorial/publication axes.
 */

import { createError } from 'h3'

import type {
  SocialProductionPriority,
  SocialProductionStatus,
  SocialProductionTaskRole,
  SocialProductionTaskType,
} from '~/types/marketing-social'
import {
  SOCIAL_PRODUCTION_STATUSES,
} from '~/types/marketing-social'

export type {
  SocialProductionPriority,
  SocialProductionStatus,
  SocialProductionTaskRole,
  SocialProductionTaskStatus,
  SocialProductionTaskType,
} from '~/types/marketing-social'

export {
  SOCIAL_PRODUCTION_STATUSES,
  SOCIAL_PRODUCTION_STATUS_LABELS,
  SOCIAL_PRODUCTION_PRIORITY_LABELS,
  SOCIAL_PRODUCTION_TASK_TYPE_LABELS,
  SOCIAL_PRODUCTION_TASK_STATUS_LABELS,
  SOCIAL_PRODUCTION_TASK_ROLE_LABELS,
} from '~/types/marketing-social'

export interface ProductionMoveInput {
  postId: string
  tenantId: string
  toStatus: SocialProductionStatus
  blockedReason?: string | null
  note?: string | null
  userId: string
}

export interface ProductionMoveResult {
  postId: string
  fromStatus: SocialProductionStatus
  toStatus: SocialProductionStatus
}

/** Pure validation — blocked requires a reason; same-status is a no-op. */
export function assertProductionMove(input: {
  fromStatus: SocialProductionStatus
  toStatus: SocialProductionStatus
  blockedReason?: string | null
}): void {
  if (input.toStatus === 'blocked') {
    const reason = (input.blockedReason || '').trim()
    if (reason.length < 3)
      throw createError({ statusCode: 400, statusMessage: 'Informe o motivo do bloqueio (mín. 3 caracteres)' })
  }
}

export async function moveProductionCard(
  client: any,
  input: ProductionMoveInput,
): Promise<ProductionMoveResult> {
  const { data: post, error } = await client
    .from('social_posts')
    .select('id, tenant_id, production_status, deleted_at')
    .eq('id', input.postId)
    .eq('tenant_id', input.tenantId)
    .maybeSingle()

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })
  if (!post || post.deleted_at)
    throw createError({ statusCode: 404, statusMessage: 'Conteúdo não encontrado' })

  const fromStatus = String(post.production_status || 'backlog') as SocialProductionStatus
  if (!SOCIAL_PRODUCTION_STATUSES.includes(input.toStatus))
    throw createError({ statusCode: 400, statusMessage: 'Status de produção inválido' })

  if (fromStatus === input.toStatus) {
    return { postId: input.postId, fromStatus, toStatus: input.toStatus }
  }

  assertProductionMove({
    fromStatus,
    toStatus: input.toStatus,
    blockedReason: input.blockedReason,
  })

  const updatePayload: Record<string, unknown> = {
    production_status: input.toStatus,
    updated_at: new Date().toISOString(),
  }
  if (input.toStatus === 'blocked')
    updatePayload.blocked_reason = String(input.blockedReason).trim()
  else if (fromStatus === 'blocked')
    updatePayload.blocked_reason = null

  const { error: updateError } = await client
    .from('social_posts')
    .update(updatePayload)
    .eq('id', input.postId)
    .eq('tenant_id', input.tenantId)
    .is('deleted_at', null)

  if (updateError)
    throw createError({ statusCode: 400, statusMessage: updateError.message })

  const { error: movementError } = await client
    .from('social_production_movements')
    .insert({
      tenant_id: input.tenantId,
      post_id: input.postId,
      from_status: fromStatus,
      to_status: input.toStatus,
      blocked_reason: input.toStatus === 'blocked' ? String(input.blockedReason).trim() : null,
      note: input.note?.trim() || null,
      moved_by: input.userId,
    })

  if (movementError)
    throw createError({ statusCode: 400, statusMessage: movementError.message })

  return { postId: input.postId, fromStatus, toStatus: input.toStatus }
}

export function isProductionOverdue(dueAt: string | null | undefined, status: SocialProductionStatus): boolean {
  if (!dueAt)
    return false
  if (status === 'published' || status === 'approved' || status === 'scheduled')
    return false
  return new Date(dueAt).getTime() < Date.now()
}

export function defaultTasksForStatus(status: SocialProductionStatus): Array<{
  taskType: SocialProductionTaskType
  title: string
  roleScope: SocialProductionTaskRole
  priority?: SocialProductionPriority
}> {
  switch (status) {
    case 'briefing_pending':
      return [{ taskType: 'prepare_briefing', title: 'Preparar briefing', roleScope: 'social_media' }]
    case 'copy_in_progress':
      return [{ taskType: 'write_copy', title: 'Escrever copy', roleScope: 'copywriter' }]
    case 'design_in_progress':
      return [{ taskType: 'create_design', title: 'Criar design', roleScope: 'designer' }]
    case 'internal_review':
      return [{ taskType: 'review', title: 'Revisão interna', roleScope: 'reviewer' }]
    case 'awaiting_client_approval':
      return [{ taskType: 'send_to_client', title: 'Enviar ao cliente', roleScope: 'social_media' }]
    case 'changes_requested':
      return [{ taskType: 'fix', title: 'Aplicar correções', roleScope: 'any' }]
    case 'scheduled':
      return [{ taskType: 'schedule', title: 'Confirmar agendamento', roleScope: 'social_media' }]
    case 'published':
      return [{ taskType: 'verify_publication', title: 'Verificar publicação', roleScope: 'social_media' }]
    default:
      return []
  }
}

export function mapProductionTask(row: any) {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    postId: String(row.post_id),
    taskType: row.task_type as SocialProductionTaskType,
    title: String(row.title),
    description: String(row.description || ''),
    status: row.status,
    priority: row.priority,
    roleScope: row.role_scope,
    assigneeId: row.assignee_id ? String(row.assignee_id) : null,
    dueAt: row.due_at || null,
    checklist: Array.isArray(row.checklist) ? row.checklist : [],
    dependsOn: Array.isArray(row.depends_on) ? row.depends_on.map(String) : [],
    assetIds: Array.isArray(row.asset_ids) ? row.asset_ids.map(String) : [],
    blockedReason: row.blocked_reason || null,
    completedAt: row.completed_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
