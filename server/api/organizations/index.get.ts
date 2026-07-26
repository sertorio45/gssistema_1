import { getQuery } from 'h3'
import { z } from 'zod'

import { ORGANIZATION_TYPES } from '~/constants/workspace'
import { listAccessibleOrganizations, requireWorkspaceContext } from '~/server/utils/workspace-context'

const querySchema = z.object({
  type: z.enum(ORGANIZATION_TYPES as [string, ...string[]]).optional(),
})

export default defineEventHandler(async (event) => {
  const input = querySchema.parse(getQuery(event))
  const context = await requireWorkspaceContext(event, {
    organizationId: null,
    capability: 'organization.read',
  })

  const organizations = await listAccessibleOrganizations(context.client, {
    userId: context.userId,
    isPlatformStaff: context.isPlatformStaff,
    type: (input.type as any) ?? null,
  })

  if (!organizations.length)
    return { data: [] }

  const organizationIds = organizations.map(organization => organization.id)

  const [{ data: links }, { data: members }] = await Promise.all([
    context.client
      .from('organization_tenants')
      .select('organization_id, tenant_id, is_primary, relationship_type, is_active, started_at, ended_at, tenant:tenant_id (id, name, slug, is_active)')
      .in('organization_id', organizationIds),
    context.client
      .from('organization_memberships')
      .select('id, organization_id, user_id, role, is_active, access_all_tenants')
      .in('organization_id', organizationIds),
  ])

  return {
    data: organizations.map(organization => ({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      type: organization.type,
      is_active: organization.isActive,
      tenant_id: organization.anchorTenantId,
      settings: organization.settings,
      organization_tenants: (links || []).filter(
        (link: any) => String(link.organization_id) === organization.id,
      ),
      organization_memberships: (members || []).filter(
        (member: any) => String(member.organization_id) === organization.id,
      ),
    })),
  }
})
