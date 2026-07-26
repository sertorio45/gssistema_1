import { getRouterParam } from 'h3'
import { z } from 'zod'

import { requireWorkspaceContext } from '~/server/utils/workspace-context'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

export default defineEventHandler(async (event) => {
  const { id: organizationId } = paramsSchema.parse({ id: getRouterParam(event, 'id') })

  const context = await requireWorkspaceContext(event, {
    organizationId,
    capability: 'organization.team.manage',
  })

  const { data: members, error } = await context.client
    .from('organization_memberships')
    .select(`
      id, user_id, role, role_id, is_active, access_all_tenants, created_at, updated_at,
      organization_role:role_id (id, name, slug, is_protected, is_system)
    `)
    .eq('organization_id', organizationId)
    .order('created_at')

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  const membershipIds = (members || []).map((member: any) => String(member.id))
  const { data: assignments } = membershipIds.length
    ? await context.client
        .from('organization_member_tenants')
        .select('organization_membership_id, tenant_id, is_active, tenant:tenant_id (id, name, slug)')
        .in('organization_membership_id', membershipIds)
        .eq('is_active', true)
    : { data: [] }

  const enriched = await Promise.all((members || []).map(async (member: any) => {
    let email: string | null = null
    let lastSignInAt: string | null = null
    try {
      const { data } = await context.client.auth.admin.getUserById(String(member.user_id))
      email = data.user?.email ?? null
      lastSignInAt = (data.user as any)?.last_sign_in_at ?? null
    }
    catch {
      // Auth lookup is best-effort for display only.
    }

    return {
      ...member,
      email,
      last_sign_in_at: lastSignInAt,
      role_name: member.organization_role?.name || member.role,
      role_slug: member.organization_role?.slug || null,
      tenants: (assignments || []).filter(
        (row: any) => String(row.organization_membership_id) === String(member.id),
      ),
    }
  }))

  return { data: enriched }
})
