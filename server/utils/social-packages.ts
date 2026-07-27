/**
 * Client packages, SLA stage deadlines and lightweight ops metrics.
 */

import { createError } from 'h3'

import {
  DEFAULT_SLA_DAYS,
  SOCIAL_SLA_STAGE_KEYS,
  SOCIAL_SLA_STAGE_LABELS,
  type SocialSlaStageKey,
} from '~/constants/social-packages'

export {
  DEFAULT_SLA_DAYS,
  SOCIAL_SLA_STAGE_KEYS,
  SOCIAL_SLA_STAGE_LABELS,
  type SocialSlaStageKey,
}

/** Count Mon–Fri days between two dates (inclusive of start, exclusive of end-style). */
export function addBusinessDays(from: Date, days: number): Date {
  const result = new Date(from)
  let remaining = Math.max(0, days)
  while (remaining > 0) {
    result.setDate(result.getDate() + 1)
    const weekday = result.getDay()
    if (weekday !== 0 && weekday !== 6)
      remaining -= 1
  }
  return result
}

export function businessDaysBetween(from: Date, to: Date): number {
  if (to <= from)
    return 0
  let count = 0
  const cursor = new Date(from)
  while (cursor < to) {
    cursor.setDate(cursor.getDate() + 1)
    const weekday = cursor.getDay()
    if (weekday !== 0 && weekday !== 6)
      count += 1
  }
  return count
}

export interface PackageUsage {
  posts: { contracted: number, produced: number, approved: number, published: number, remaining: number, excess: number }
  reels: { contracted: number, produced: number, remaining: number, excess: number }
  stories: { contracted: number, produced: number, remaining: number, excess: number }
  campaigns: { contracted: number, produced: number, remaining: number, excess: number }
  overQuota: boolean
}

function remaining(contracted: number, used: number) {
  return Math.max(0, contracted - used)
}

function excess(contracted: number, used: number) {
  return Math.max(0, used - contracted)
}

export async function getActivePackage(client: any, tenantId: string) {
  const today = new Date().toISOString().slice(0, 10)
  const { data } = await client
    .from('social_client_packages')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .lte('starts_at', today)
    .or(`ends_at.is.null,ends_at.gte.${today}`)
    .order('starts_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data || null
}

export async function computePackageUsage(client: any, tenantId: string, packageRow: any): Promise<PackageUsage> {
  const start = packageRow.starts_at
  const end = packageRow.ends_at || '9999-12-31'

  const { data: posts } = await client
    .from('social_posts')
    .select('id, editorial_status, publication_status, social_post_variants!social_post_variants_post_id_fkey(format)')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .gte('created_at', `${start}T00:00:00.000Z`)
    .lte('created_at', `${end}T23:59:59.999Z`)

  const rows = posts || []
  let reels = 0
  let stories = 0
  for (const post of rows) {
    const formats = (post.social_post_variants || []).map((v: any) => v.format)
    if (formats.includes('video'))
      reels += 1
    if (formats.includes('story'))
      stories += 1
  }

  const produced = rows.length
  const approved = rows.filter((p: any) => p.editorial_status === 'approved').length
  const published = rows.filter((p: any) =>
    ['published', 'partially_published'].includes(String(p.publication_status)),
  ).length

  const { count: campaignsCount } = await client
    .from('social_campaigns')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('created_at', `${start}T00:00:00.000Z`)
    .lte('created_at', `${end}T23:59:59.999Z`)

  const postsQuota = Number(packageRow.posts_quota || 0)
  const reelsQuota = Number(packageRow.reels_quota || 0)
  const storiesQuota = Number(packageRow.stories_quota || 0)
  const campaignsQuota = Number(packageRow.campaigns_quota || 0)
  const campaignsProduced = campaignsCount || 0

  const usage: PackageUsage = {
    posts: {
      contracted: postsQuota,
      produced,
      approved,
      published,
      remaining: remaining(postsQuota, produced),
      excess: excess(postsQuota, produced),
    },
    reels: {
      contracted: reelsQuota,
      produced: reels,
      remaining: remaining(reelsQuota, reels),
      excess: excess(reelsQuota, reels),
    },
    stories: {
      contracted: storiesQuota,
      produced: stories,
      remaining: remaining(storiesQuota, stories),
      excess: excess(storiesQuota, stories),
    },
    campaigns: {
      contracted: campaignsQuota,
      produced: campaignsProduced,
      remaining: remaining(campaignsQuota, campaignsProduced),
      excess: excess(campaignsQuota, campaignsProduced),
    },
    overQuota: false,
  }

  usage.overQuota = (postsQuota > 0 && usage.posts.excess > 0)
    || (reelsQuota > 0 && usage.reels.excess > 0)
    || (storiesQuota > 0 && usage.stories.excess > 0)
    || (campaignsQuota > 0 && usage.campaigns.excess > 0)

  return usage
}

export async function assertPackageAllowsNewPost(client: any, tenantId: string) {
  const pkg = await getActivePackage(client, tenantId)
  if (!pkg)
    return { package: null, usage: null, warned: false }

  const usage = await computePackageUsage(client, tenantId, pkg)
  const postsQuota = Number(pkg.posts_quota || 0)
  // Quota 0 = unlimited for that dimension.
  if (postsQuota > 0 && (usage.posts.excess > 0 || usage.posts.remaining === 0)) {
    throw createError({
      statusCode: 409,
      statusMessage: `Pacote "${pkg.name}" sem cota de posts restante (${usage.posts.produced}/${usage.posts.contracted}).`,
    })
  }
  return {
    package: pkg,
    usage,
    warned: postsQuota > 0 && usage.posts.remaining <= 2,
  }
}

export async function computeOpsMetrics(client: any, tenantId: string, fromIso: string, toIso: string) {
  const { data: posts } = await client
    .from('social_posts')
    .select('id, created_at, published_at, production_due_at, production_status, editorial_status, publication_status, current_version, assigned_to, copy_owner_id, design_owner_id')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .gte('created_at', fromIso)
    .lte('created_at', toIso)

  const rows = posts || []
  const published = rows.filter((p: any) => p.published_at)
  let totalCycleHours = 0
  for (const post of published) {
    const start = new Date(post.created_at).getTime()
    const end = new Date(post.published_at).getTime()
    if (end > start)
      totalCycleHours += (end - start) / 3600_000
  }

  const overdue = rows.filter((p: any) =>
    p.production_due_at
    && new Date(p.production_due_at).getTime() < Date.now()
    && !['published', 'approved', 'scheduled'].includes(String(p.production_status)),
  )

  const failed = rows.filter((p: any) => p.publication_status === 'failed').length
  const firstVersionApproved = rows.filter((p: any) =>
    p.editorial_status === 'approved' && Number(p.current_version) === 1,
  ).length
  const approved = rows.filter((p: any) => p.editorial_status === 'approved').length

  const { data: movements } = await client
    .from('social_production_movements')
    .select('post_id, from_status, to_status, created_at')
    .eq('tenant_id', tenantId)
    .gte('created_at', fromIso)
    .lte('created_at', toIso)

  const changesRequested = (movements || []).filter((m: any) => m.to_status === 'changes_requested').length

  const { data: tasks } = await client
    .from('social_production_tasks')
    .select('assignee_id, status, due_at')
    .eq('tenant_id', tenantId)
    .not('status', 'in', '("done","cancelled")')

  const loadByAssignee = new Map<string, number>()
  let overdueTasks = 0
  for (const task of tasks || []) {
    if (task.assignee_id)
      loadByAssignee.set(task.assignee_id, (loadByAssignee.get(task.assignee_id) || 0) + 1)
    if (task.due_at && new Date(task.due_at).getTime() < Date.now())
      overdueTasks += 1
  }

  const pkg = await getActivePackage(client, tenantId)
  const usage = pkg ? await computePackageUsage(client, tenantId, pkg) : null

  return {
    period: { from: fromIso, to: toIso },
    totals: {
      created: rows.length,
      published: published.length,
      overdue: overdue.length,
      failed,
      changesRequested,
      overdueTasks,
    },
    averages: {
      productionCycleHours: published.length ? Number((totalCycleHours / published.length).toFixed(1)) : null,
      versionsPerPost: rows.length
        ? Number((rows.reduce((sum: number, p: any) => sum + Number(p.current_version || 1), 0) / rows.length).toFixed(2))
        : null,
      firstVersionApprovalRate: approved
        ? Number(((firstVersionApproved / approved) * 100).toFixed(1))
        : null,
    },
    deliveredOnTime: published.filter((p: any) =>
      !p.production_due_at || new Date(p.published_at).getTime() <= new Date(p.production_due_at).getTime(),
    ).length,
    packageUsage: usage,
    teamLoad: [...loadByAssignee.entries()].map(([userId, openTasks]) => ({ userId, openTasks })),
  }
}
