import { getRouterParam, readBody } from 'h3'
import { z } from 'zod'

import { recordSocialAudit } from '~/server/utils/social-audit'
import { requireSocialContext } from '~/server/utils/social-context'
import { mapProductionTask } from '~/server/utils/social-production'
import {
  SOCIAL_PRODUCTION_PRIORITIES,
  SOCIAL_PRODUCTION_TASK_ROLES,
  SOCIAL_PRODUCTION_TASK_STATUSES,
} from '~/types/marketing-social'

const bodySchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  status: z.enum(SOCIAL_PRODUCTION_TASK_STATUSES).optional(),
  priority: z.enum(SOCIAL_PRODUCTION_PRIORITIES).optional(),
  roleScope: z.enum(SOCIAL_PRODUCTION_TASK_ROLES).optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  dueAt: z.string().datetime({ offset: true }).nullable().optional(),
  checklist: z.array(z.object({
    id: z.string().min(1).max(64),
    label: z.string().min(1).max(200),
    done: z.boolean(),
  })).max(50).optional(),
  blockedReason: z.string().trim().max(500).nullable().optional(),
  note: z.string().trim().max(500).nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const taskId = String(getRouterParam(event, 'id'))
  const body = bodySchema.parse(await readBody(event))
  const { client, tenantId, user } = await requireSocialContext(event, 'marketing.social.tasks.manage')

  const { data: existing } = await client
    .from('social_production_tasks')
    .select('*')
    .eq('id', taskId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!existing)
    throw createError({ statusCode: 404, statusMessage: 'Tarefa não encontrada' })

  if (body.status === 'blocked') {
    const reason = (body.blockedReason || '').trim()
    if (reason.length < 3)
      throw createError({ statusCode: 400, statusMessage: 'Informe o motivo do bloqueio da tarefa' })
  }

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (body.title !== undefined)
    updatePayload.title = body.title
  if (body.description !== undefined)
    updatePayload.description = body.description
  if (body.status !== undefined)
    updatePayload.status = body.status
  if (body.priority !== undefined)
    updatePayload.priority = body.priority
  if (body.roleScope !== undefined)
    updatePayload.role_scope = body.roleScope
  if (body.assigneeId !== undefined)
    updatePayload.assignee_id = body.assigneeId
  if (body.dueAt !== undefined)
    updatePayload.due_at = body.dueAt
  if (body.checklist !== undefined)
    updatePayload.checklist = body.checklist
  if (body.blockedReason !== undefined)
    updatePayload.blocked_reason = body.blockedReason
  if (body.status === 'done') {
    updatePayload.completed_at = new Date().toISOString()
    updatePayload.completed_by = user.id
  }
  if (body.status && body.status !== 'done') {
    updatePayload.completed_at = null
    updatePayload.completed_by = null
  }

  const { data, error } = await client
    .from('social_production_tasks')
    .update(updatePayload)
    .eq('id', taskId)
    .eq('tenant_id', tenantId)
    .select('*')
    .single()

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  if (body.status && body.status !== existing.status) {
    await client.from('social_production_task_events').insert({
      tenant_id: tenantId,
      task_id: taskId,
      post_id: existing.post_id,
      event_type: 'status_changed',
      from_status: existing.status,
      to_status: body.status,
      note: body.note || null,
      actor_id: user.id,
    })
  }

  await recordSocialAudit(event, client, {
    tenantId,
    actorId: user.id,
    action: 'production.task.updated',
    entityType: 'social_production_task',
    entityId: taskId,
    after: { status: data.status },
  })

  return { data: mapProductionTask(data) }
})
