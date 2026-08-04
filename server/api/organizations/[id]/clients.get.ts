import { getRouterParam } from 'h3'
import { z } from 'zod'

import {
  assertAgencyOrganization,
  listAccessibleManagedClientIds,
} from '~/server/utils/agency-ops'
import { requireWorkspaceContext } from '~/server/utils/workspace-context'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

/**
 * Rich client portfolio for the agency. Every row is already filtered by the
 * caller's reachable managed tenants — selection never expands reach.
 */
export default defineEventHandler(async (event) => {
  const { id: organizationId } = paramsSchema.parse({ id: getRouterParam(event, 'id') })

  const context = await requireWorkspaceContext(event, {
    organizationId,
    capability: 'agency.clients.read',
  })

  assertAgencyOrganization(context)

  const tenantIds = await listAccessibleManagedClientIds(context, organizationId)
  if (!tenantIds.length)
    return { data: [] }

  const [
    { data: links },
    { data: modules },
    { data: userRoles },
    { data: accounts },
    { data: pendingPosts },
    { data: scheduledPosts },
    { data: failedPosts },
  ] = await Promise.all([
    context.client
      .from('organization_tenants')
      .select('id, tenant_id, is_active, display_name, logo_url, internal_owner_user_id, metadata, started_at, ended_at, tenant:tenant_id (id, name, slug, is_active)')
      .eq('organization_id', organizationId)
      .eq('relationship_type', 'managed')
      .in('tenant_id', tenantIds)
      .order('display_name', { ascending: true, nullsFirst: false }),
    context.client
      .from('tenant_modules')
      .select('tenant_id, module_name, is_active')
      .in('tenant_id', tenantIds)
      .eq('is_active', true),
    context.client
      .from('user_tenant_role')
      .select('tenant_id, user_id')
      .in('tenant_id', tenantIds),
    context.client
      .from('social_accounts')
      .select('tenant_id, platform, name, username, is_active')
      .in('tenant_id', tenantIds)
      .eq('is_active', true),
    context.client
      .from('social_posts')
      .select('tenant_id')
      .in('tenant_id', tenantIds)
      .eq('status', 'pending_approval'),
    context.client
      .from('social_posts')
      .select('tenant_id')
      .in('tenant_id', tenantIds)
      .eq('status', 'scheduled'),
    context.client
      .from('social_posts')
      .select('tenant_id, updated_at')
      .in('tenant_id', tenantIds)
      .eq('status', 'failed')
      .gte('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
  ])

  const ownerIds = [...new Set(
    (links || [])
      .map((row: any) => row.internal_owner_user_id)
      .filter(Boolean)
      .map((id: string) => String(id)),
  )]

  const ownerEmails = new Map<string, string | null>()
  if (ownerIds.length) {
    const users = await Promise.all(
      ownerIds.map(async (id) => {
        const { data } = await context.client.auth.admin.getUserById(id)
        return data.user
      }),
    )
    for (const user of users) {
      if (user)
        ownerEmails.set(user.id, user.email ?? null)
    }
  }

  const modulesByTenant = new Map<string, string[]>()
  for (const row of modules || []) {
    const tenantId = String(row.tenant_id)
    const list = modulesByTenant.get(tenantId) || []
    list.push(String(row.module_name))
    modulesByTenant.set(tenantId, list)
  }

  const usersByTenant = new Map<string, number>()
  for (const row of userRoles || []) {
    const tenantId = String(row.tenant_id)
    usersByTenant.set(tenantId, (usersByTenant.get(tenantId) || 0) + 1)
  }

  const networksByTenant = new Map<string, Array<{ platform: string, name: string | null, username: string | null }>>()
  for (const row of accounts || []) {
    const tenantId = String(row.tenant_id)
    const list = networksByTenant.get(tenantId) || []
    list.push({
      platform: String(row.platform),
      name: row.name ?? null,
      username: row.username ?? null,
    })
    networksByTenant.set(tenantId, list)
  }

  function tally(rows: any[] | null) {
    const map = new Map<string, number>()
    for (const row of rows || []) {
      const tenantId = String(row.tenant_id)
      map.set(tenantId, (map.get(tenantId) || 0) + 1)
    }
    return map
  }

  const pendingByTenant = tally(pendingPosts)
  const scheduledByTenant = tally(scheduledPosts)
  const failedByTenant = tally(failedPosts)

  return {
    data: (links || []).map((link: any) => {
      const tenant = link.tenant
      const tenantId = String(link.tenant_id)
      return {
        link_id: link.id,
        tenant_id: tenantId,
        name: link.display_name || tenant?.name || 'Cliente',
        logo_url: link.logo_url || null,
        tenant: {
          name: tenant?.name || '—',
          slug: tenant?.slug || '',
          is_active: tenant?.is_active !== false,
        },
        status: link.is_active && tenant?.is_active !== false ? 'active' : 'inactive',
        modules: modulesByTenant.get(tenantId) || [],
        internal_owner: link.internal_owner_user_id
          ? {
              user_id: link.internal_owner_user_id,
              email: ownerEmails.get(String(link.internal_owner_user_id)) || null,
            }
          : null,
        client_user_count: usersByTenant.get(tenantId) || 0,
        connected_networks: networksByTenant.get(tenantId) || [],
        posts_pending_approval: pendingByTenant.get(tenantId) || 0,
        posts_scheduled: scheduledByTenant.get(tenantId) || 0,
        recent_failures: failedByTenant.get(tenantId) || 0,
        started_at: link.started_at,
      }
    }),
  }
})
