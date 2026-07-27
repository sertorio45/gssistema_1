import { readBody } from 'h3'
import { z } from 'zod'

import { recordSocialAudit } from '~/server/utils/social-audit'
import { requireSocialContext } from '~/server/utils/social-context'
import { mapProductionTask } from '~/server/utils/social-production'
import {
  SOCIAL_PRODUCTION_PRIORITIES,
  SOCIAL_PRODUCTION_TASK_ROLES,
  SOCIAL_PRODUCTION_TASK_TYPES,
} from '~/types/marketing-social'

const bodySchema = z.object({
  postId: z.string().uuid(),
  taskType: z.enum(SOCIAL_PRODUCTION_TASK_TYPES).default('custom'),
  title: z.string().trim().min(1).max(200),
  description: z.string().max(5000).default(''),
  priority: z.enum(SOCIAL_PRODUCTION_PRIORITIES).default('normal'),
  roleScope: z.enum(SOCIAL_PRODUCTION_TASK_ROLES).default('any'),
  assigneeId: z.string().uuid().nullable().optional(),
  dueAt: z.string().datetime({ offset: true }).nullable().optional(),
  checklist: z.array(z.object({
    id: z.string().min(1).max(64),
    label: z.string().min(1).max(200),
    done: z.boolean().default(false),
  })).max(50).default([]),
  dependsOn: z.array(z.string().uuid()).max(20).default([]),
  assetIds: z.array(z.string().uuid()).max(20).default([]),
})

export default defineEventHandler(async (event) => {
  const body = bodySchema.parse(await readBody(event))
  const { client, tenantId, user } = await requireSocialContext(event, 'marketing.social.tasks.manage')

  const { data: post } = await client
    .from('social_posts')
    .select('id')
    .eq('id', body.postId)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .maybeSingle()

  if (!post)
    throw createError({ statusCode: 404, statusMessage: 'Conteúdo não encontrado' })

  const { data, error } = await client
    .from('social_production_tasks')
    .insert({
      tenant_id: tenantId,
      post_id: body.postId,
      task_type: body.taskType,
      title: body.title,
      description: body.description,
      priority: body.priority,
      role_scope: body.roleScope,
      assignee_id: body.assigneeId || null,
      due_at: body.dueAt || null,
      checklist: body.checklist,
      depends_on: body.dependsOn,
      asset_ids: body.assetIds,
      created_by: user.id,
    })
    .select('*')
    .single()

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  await client.from('social_production_task_events').insert({
    tenant_id: tenantId,
    task_id: data.id,
    post_id: body.postId,
    event_type: 'created',
    to_status: data.status,
    actor_id: user.id,
  })

  await recordSocialAudit(event, client, {
    tenantId,
    actorId: user.id,
    action: 'production.task.created',
    entityType: 'social_production_task',
    entityId: data.id,
    after: { post_id: body.postId, title: body.title },
  })

  return { data: mapProductionTask(data) }
})
