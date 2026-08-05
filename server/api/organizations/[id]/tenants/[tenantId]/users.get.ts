import { getRouterParam } from 'h3'
import { z } from 'zod'

import {
  assertAgencyOrganization,
  listAccessibleManagedClientIds,
} from '~/server/utils/agency-ops'
import { requireWorkspaceContext } from '~/server/utils/workspace-context'

const paramsSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
})

export interface TenantUserRow {
  user_id: string
  email: string | null
  name: string | null
  role: string
  status: 'pending' | 'active'
  last_sign_in_at: string | null
  created_at: string | null
}

/**
 * Users attached to a client workspace (`user_tenant_role`), enriched with the
 * Auth state so the agency can tell pending invites from activated accounts.
 */
export default defineEventHandler(async (event) => {
  const params = paramsSchema.parse({
    id: getRouterParam(event, 'id'),
    tenantId: getRouterParam(event, 'tenantId'),
  })

  const context = await requireWorkspaceContext(event, {
    organizationId: params.id,
    capability: 'agency.clients.read',
  })

  assertAgencyOrganization(context)

  const reachable = await listAccessibleManagedClientIds(context, params.id)
  if (!reachable.includes(params.tenantId)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Cliente fora do seu alcance nesta agência',
    })
  }

  const { data: rows, error } = await context.client
    .from('user_tenant_role')
    .select('user_id, role, created_at')
    .eq('tenant_id', params.tenantId)
    .order('created_at')

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  const users: TenantUserRow[] = await Promise.all((rows || []).map(async (row: any) => {
    let email: string | null = null
    let name: string | null = null
    let lastSignInAt: string | null = null

    try {
      const { data } = await context.client.auth.admin.getUserById(String(row.user_id))
      email = data.user?.email ?? null
      name = (data.user?.user_metadata as any)?.name ?? null
      lastSignInAt = (data.user as any)?.last_sign_in_at ?? null
    }
    catch {
      // Auth lookup is best-effort for display only.
    }

    return {
      user_id: String(row.user_id),
      email,
      name,
      role: String(row.role),
      status: lastSignInAt ? 'active' : 'pending',
      last_sign_in_at: lastSignInAt,
      created_at: row.created_at ?? null,
    }
  }))

  return { data: users }
})
