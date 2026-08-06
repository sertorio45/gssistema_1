import { getQuery } from 'h3'
import { z } from 'zod'

import { listAccessibleManagedClientIds } from '~/server/utils/agency-ops'
import { requireSocialContext } from '~/server/utils/social-context'
import { isProductionOverdue } from '~/server/utils/social-production'
import { requireWorkspaceContext } from '~/server/utils/workspace-context'
import { SOCIAL_PRODUCTION_STATUSES } from '~/types/marketing-social'

const querySchema = z.object({
  organizationId: z.string().uuid().optional(),
  tenantIdFilter: z.string().uuid().optional(),
  productionStatus: z.enum(SOCIAL_PRODUCTION_STATUSES).optional(),
  platform: z.enum(['facebook', 'instagram', 'linkedin']).optional(),
  responsibleId: z.string().uuid().optional(),
  role: z.enum(['copy', 'design', 'publish', 'any']).optional(),
  mine: z.coerce.boolean().optional(),
  overdue: z.coerce.boolean().optional(),
  dueFrom: z.string().optional(),
  dueTo: z.string().optional(),
  search: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
})

const SELECT = `
  id, tenant_id, title, content, status, current_version,
  editorial_status, publication_status,
  production_status, production_priority, production_due_at, blocked_reason,
  copy_owner_id, design_owner_id, publish_owner_id, assigned_to,
  scheduled_at, created_at, updated_at,
  social_post_variants!social_post_variants_post_id_fkey (
    id, platform, format,
    social_post_assets!social_post_assets_variant_id_fkey (
      id, position,
      media_assets!social_post_assets_asset_id_fkey (
        id, name, mime_type, object_path
      )
    )
  ),
  social_production_tasks!social_production_tasks_post_tenant_fkey (
    id, status, role_scope, assignee_id, due_at, title, task_type, priority
  )
`

export default defineEventHandler(async (event) => {
  const query = querySchema.parse(getQuery(event))

  let client: any
  let userId: string
  let tenantIds: string[] = []
  let tenantNames = new Map<string, string>()

  if (query.organizationId) {
    const workspace = await requireWorkspaceContext(event, {
      organizationId: query.organizationId,
      capability: 'agency.clients.read',
    })
    client = workspace.client
    userId = workspace.userId
    tenantIds = await listAccessibleManagedClientIds(workspace, query.organizationId)
    if (query.tenantIdFilter) {
      if (!tenantIds.includes(query.tenantIdFilter))
        return { data: [], columns: SOCIAL_PRODUCTION_STATUSES }
      tenantIds = [query.tenantIdFilter]
    }
  }
  else {
    const ctx = await requireSocialContext(event, 'marketing.social.read')
    client = ctx.client
    userId = ctx.user.id
    tenantIds = [ctx.tenantId]
  }

  if (!tenantIds.length)
    return { data: [], columns: SOCIAL_PRODUCTION_STATUSES }

  const { data: tenants } = await client
    .from('tenant')
    .select('id, name')
    .in('id', tenantIds)
  for (const row of tenants || [])
    tenantNames.set(String(row.id), String(row.name))

  let request = client
    .from('social_posts')
    .select(SELECT)
    .in('tenant_id', tenantIds)
    .is('deleted_at', null)
    .order('production_due_at', { ascending: true, nullsFirst: false })
    .limit(300)

  if (query.productionStatus)
    request = request.eq('production_status', query.productionStatus)
  if (query.priority)
    request = request.eq('production_priority', query.priority)
  if (query.search)
    request = request.ilike('title', `%${query.search.trim()}%`)
  if (query.dueFrom)
    request = request.gte('production_due_at', query.dueFrom)
  if (query.dueTo)
    request = request.lte('production_due_at', query.dueTo)

  const { data, error } = await request
  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  let rows = data || []

  if (query.platform) {
    rows = rows.filter((row: any) =>
      (row.social_post_variants || []).some((v: any) => v.platform === query.platform),
    )
  }

  if (query.responsibleId || query.mine) {
    const targetUser = query.mine ? userId : query.responsibleId!
    rows = rows.filter((row: any) => {
      const matchesOwner = row.copy_owner_id === targetUser
        || row.design_owner_id === targetUser
        || row.publish_owner_id === targetUser
        || row.assigned_to === targetUser
      const matchesTask = (row.social_production_tasks || []).some(
        (task: any) => task.assignee_id === targetUser && task.status !== 'done' && task.status !== 'cancelled',
      )
      return matchesOwner || matchesTask
    })
  }

  if (query.role === 'copy')
    rows = rows.filter((row: any) => row.copy_owner_id && (!query.mine || row.copy_owner_id === userId))
  if (query.role === 'design')
    rows = rows.filter((row: any) => row.design_owner_id && (!query.mine || row.design_owner_id === userId))
  if (query.role === 'publish')
    rows = rows.filter((row: any) => row.publish_owner_id && (!query.mine || row.publish_owner_id === userId))

  if (query.overdue) {
    rows = rows.filter((row: any) =>
      isProductionOverdue(row.production_due_at, row.production_status),
    )
  }

  const paths = rows
    .flatMap((post: any) => post.social_post_variants || [])
    .flatMap((variant: any) => variant.social_post_assets || [])
    .map((relation: any) => relation.media_assets?.object_path)
    .filter(Boolean)
  const { data: signedRows } = paths.length
    ? await client.storage.from('marketing-assets').createSignedUrls(paths, 60 * 60)
    : { data: [] }
  const signedUrls = new Map((signedRows || []).map((row: any) => [row.path, row.signedUrl]))

  const mapped = rows.map((post: any) => {
    const platforms = [...new Set((post.social_post_variants || []).map((v: any) => v.platform))]
    const formats = [...new Set((post.social_post_variants || []).map((v: any) => v.format))]
    const openTasks = (post.social_production_tasks || []).filter(
      (task: any) => task.status !== 'done' && task.status !== 'cancelled',
    )
    let previewUrl: string | null = null
    for (const variant of post.social_post_variants || []) {
      for (const relation of variant.social_post_assets || []) {
        const path = relation.media_assets?.object_path
        if (path && signedUrls.get(path)) {
          previewUrl = signedUrls.get(path) || null
          break
        }
      }
      if (previewUrl)
        break
    }

    return {
      id: post.id,
      tenant_id: post.tenant_id,
      client_name: tenantNames.get(String(post.tenant_id)) || 'Cliente',
      title: post.title,
      platforms,
      formats,
      production_status: post.production_status,
      production_priority: post.production_priority,
      production_due_at: post.production_due_at,
      blocked_reason: post.blocked_reason,
      editorial_status: post.editorial_status,
      publication_status: post.publication_status,
      current_version: post.current_version,
      copy_owner_id: post.copy_owner_id,
      design_owner_id: post.design_owner_id,
      publish_owner_id: post.publish_owner_id,
      assigned_to: post.assigned_to,
      owner_labels: [
        post.copy_owner_id ? 'C' : null,
        post.design_owner_id ? 'D' : null,
        post.publish_owner_id ? 'P' : null,
      ].filter(Boolean),
      open_tasks_count: openTasks.length,
      overdue: isProductionOverdue(post.production_due_at, post.production_status),
      preview_url: previewUrl,
      href: `/marketing/content/${post.id}`,
    }
  })

  return {
    data: mapped,
    columns: SOCIAL_PRODUCTION_STATUSES,
  }
})
