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
    capability: 'organization.members.manage',
  })

  const { data: members, error } = await context.client
    .from('organization_memberships')
    .select('id, user_id, role, is_active, access_all_tenants, created_at, updated_at')
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

  return {
    data: (members || []).map((member: any) => ({
      ...member,
      tenants: (assignments || []).filter(
        (row: any) => String(row.organization_membership_id) === String(member.id),
      ),
    })),
  }
})
