import { getRouterParam } from 'h3'
import { z } from 'zod'

import {
  assertAgencyOrganization,
  countByTenantIds,
  listAccessibleManagedClientIds,
} from '~/server/utils/agency-ops'
import { requireWorkspaceContext } from '~/server/utils/workspace-context'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

/**
 * Aggregated operational metrics for the agency dashboard.
 * Counts only cover managed clients the caller can already access.
 */
export default defineEventHandler(async (event) => {
  const { id: organizationId } = paramsSchema.parse({ id: getRouterParam(event, 'id') })

  const context = await requireWorkspaceContext(event, {
    organizationId,
    capability: 'agency.clients.read',
  })

  assertAgencyOrganization(context)

  const tenantIds = await listAccessibleManagedClientIds(context, organizationId)
  const nowIso = new Date().toISOString()
  const recentFailuresSince = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const upcomingUntil = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

  const [
    activeClients,
    pendingInternalApprovals,
    pendingClientApprovals,
    changesRequested,
    approvedAwaitingSchedule,
    publicationErrors,
    overdueApprovals,
    assignedTasks,
    upcomingScheduled,
  ] = await Promise.all([
    Promise.resolve(tenantIds.length),
    countByTenantIds(context.client, 'approval_requests', tenantIds, query =>
      query.eq('status', 'pending').eq('stage', 'internal')),
    countByTenantIds(context.client, 'approval_requests', tenantIds, query =>
      query.eq('status', 'pending').eq('stage', 'client')),
    countByTenantIds(context.client, 'social_posts', tenantIds, query =>
      query.eq('status', 'changes_requested')),
    countByTenantIds(context.client, 'social_posts', tenantIds, query =>
      query.eq('status', 'approved').is('scheduled_at', null)),
    countByTenantIds(context.client, 'social_posts', tenantIds, query =>
      query.eq('status', 'failed').gte('updated_at', recentFailuresSince)),
    countByTenantIds(context.client, 'approval_requests', tenantIds, query =>
      query.eq('status', 'pending').lt('due_at', nowIso).not('due_at', 'is', null)),
    countByTenantIds(context.client, 'social_posts', tenantIds, query =>
      query.eq('assigned_to', context.userId).not('status', 'in', '("published","archived","failed")')),
    countByTenantIds(context.client, 'social_posts', tenantIds, query =>
      query.eq('status', 'scheduled').gte('scheduled_at', nowIso).lte('scheduled_at', upcomingUntil)),
  ])

  let pendingSocialIntegrations = 0
  if (tenantIds.length) {
    const { data: accounts } = await context.client
      .from('social_accounts')
      .select('tenant_id, platform, is_active')
      .in('tenant_id', tenantIds)
      .eq('is_active', true)
      .in('platform', ['instagram', 'facebook'])

    const connected = new Set<string>()
    for (const row of accounts || []) {
      if (row.tenant_id && row.platform)
        connected.add(`${row.tenant_id}:${row.platform}`)
    }

    for (const tenantId of tenantIds) {
      const hasInstagram = connected.has(`${tenantId}:instagram`)
      const hasFacebook = connected.has(`${tenantId}:facebook`)
      if (!hasInstagram || !hasFacebook)
        pendingSocialIntegrations += 1
    }
  }

  return {
    data: {
      active_clients: activeClients,
      pending_social_integrations: pendingSocialIntegrations,
      pending_internal_reviews: pendingInternalApprovals,
      pending_client_reviews: pendingClientApprovals,
      changes_requested: changesRequested,
      approved_awaiting_schedule: approvedAwaitingSchedule,
      publication_errors: publicationErrors,
      overdue_approvals: overdueApprovals,
      assigned_tasks: assignedTasks,
      upcoming_scheduled_posts: upcomingScheduled,
      scope_tenant_count: tenantIds.length,
    },
  }
})
