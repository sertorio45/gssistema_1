import { getQuery } from 'h3'
import { z } from 'zod'

import { requireSocialContext } from '~/server/utils/social-context'
import { mapProductionTask } from '~/server/utils/social-production'
import {
  SOCIAL_PRODUCTION_TASK_ROLES,
  SOCIAL_PRODUCTION_TASK_STATUSES,
} from '~/types/marketing-social'

const querySchema = z.object({
  postId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional(),
  mine: z.coerce.boolean().optional(),
  overdue: z.coerce.boolean().optional(),
  roleScope: z.enum(SOCIAL_PRODUCTION_TASK_ROLES).optional(),
  status: z.enum(SOCIAL_PRODUCTION_TASK_STATUSES).optional(),
  queue: z.enum([
    'designer',
    'copywriter',
    'social_media',
    'reviewer',
    'mine',
    'overdue',
  ]).optional(),
})

export default defineEventHandler(async (event) => {
  const query = querySchema.parse(getQuery(event))
  const { client, tenantId, user } = await requireSocialContext(event, 'marketing.social.read')

  let request = client
    .from('social_production_tasks')
    .select(`
      *,
      social_posts!social_production_tasks_post_tenant_fkey (id, title, production_status)
    `)
    .eq('tenant_id', tenantId)
    .order('due_at', { ascending: true, nullsFirst: false })
    .limit(200)

  if (query.postId)
    request = request.eq('post_id', query.postId)
  if (query.status)
    request = request.eq('status', query.status)
  else
    request = request.not('status', 'in', '("done","cancelled")')

  if (query.queue === 'mine' || query.mine)
    request = request.eq('assignee_id', user.id)
  else if (query.assigneeId)
    request = request.eq('assignee_id', query.assigneeId)

  if (query.queue === 'designer' || query.roleScope === 'designer')
    request = request.eq('role_scope', 'designer')
  if (query.queue === 'copywriter' || query.roleScope === 'copywriter')
    request = request.eq('role_scope', 'copywriter')
  if (query.queue === 'social_media' || query.roleScope === 'social_media')
    request = request.eq('role_scope', 'social_media')
  if (query.queue === 'reviewer' || query.roleScope === 'reviewer')
    request = request.eq('role_scope', 'reviewer')

  const { data, error } = await request
  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  let rows = data || []
  if (query.queue === 'overdue' || query.overdue) {
    const now = Date.now()
    rows = rows.filter((row: any) =>
      row.due_at && new Date(row.due_at).getTime() < now && row.status !== 'done',
    )
  }

  return {
    data: rows.map((row: any) => ({
      ...mapProductionTask(row),
      postTitle: row.social_posts?.title || null,
      productionStatus: row.social_posts?.production_status || null,
    })),
  }
})
