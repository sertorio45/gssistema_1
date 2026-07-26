import type { WorkspaceCapability } from '~/constants/workspace'
import type { WorkspaceClient, WorkspaceContext } from '~/server/utils/workspace-context'

import { createError } from 'h3'

import { ALL_WORKSPACE_CAPABILITIES, holdsCapability } from '~/constants/workspace'

export interface OrganizationRoleRow {
  id: string
  organization_id: string | null
  name: string
  slug: string
  description: string
  organization_type: string | null
  is_system: boolean
  is_default: boolean
  is_editable: boolean
  is_protected: boolean
  legacy_app_role: string
  created_at: string
  updated_at: string
  member_count?: number
  capabilities?: Array<{ capability: string, allowed: boolean }>
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export function buildRoleSlug(name: string, fallback = 'cargo'): string {
  return slugify(name) || fallback
}

/** An actor may only grant capabilities they themselves hold. */
export function assertAssignableCapabilities(
  actorCapabilities: Iterable<string>,
  requested: string[],
) {
  for (const capability of requested) {
    if (!ALL_WORKSPACE_CAPABILITIES.includes(capability as WorkspaceCapability))
      throw createError({ statusCode: 422, statusMessage: `Capability inválida: ${capability}` })
    if (!holdsCapability(actorCapabilities, capability)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Não é possível conceder uma permissão superior à sua',
      })
    }
  }
}

export async function loadOrganizationRole(
  client: WorkspaceClient,
  roleId: string,
  organizationId?: string | null,
): Promise<OrganizationRoleRow> {
  let query = client
    .from('organization_roles')
    .select('*')
    .eq('id', roleId)

  if (organizationId)
    query = query.eq('organization_id', organizationId)

  const { data, error } = await query.maybeSingle()
  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })
  if (!data)
    throw createError({ statusCode: 404, statusMessage: 'Cargo não encontrado' })
  return data as OrganizationRoleRow
}

export async function listOrganizationRoles(
  client: WorkspaceClient,
  organizationId: string,
): Promise<OrganizationRoleRow[]> {
  const { data: roles, error } = await client
    .from('organization_roles')
    .select('*')
    .eq('organization_id', organizationId)
    .order('is_protected', { ascending: false })
    .order('name')

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  const roleIds = (roles || []).map((role: any) => String(role.id))
  const { data: caps } = roleIds.length
    ? await client
      .from('organization_role_capabilities')
      .select('role_id, capability, allowed')
      .in('role_id', roleIds)
    : { data: [] }

  const { data: members } = roleIds.length
    ? await client
      .from('organization_memberships')
      .select('role_id')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .in('role_id', roleIds)
    : { data: [] }

  const counts = new Map<string, number>()
  for (const row of members || []) {
    const key = String(row.role_id)
    counts.set(key, (counts.get(key) || 0) + 1)
  }

  return (roles || []).map((role: any) => ({
    ...role,
    member_count: counts.get(String(role.id)) || 0,
    capabilities: (caps || [])
      .filter((row: any) => String(row.role_id) === String(role.id) && row.allowed)
      .map((row: any) => ({ capability: String(row.capability), allowed: true })),
  }))
}

export async function replaceRoleCapabilities(
  client: WorkspaceClient,
  roleId: string,
  capabilities: string[],
) {
  await client.from('organization_role_capabilities').delete().eq('role_id', roleId)

  if (!capabilities.length)
    return

  const { error } = await client
    .from('organization_role_capabilities')
    .insert(capabilities.map(capability => ({
      role_id: roleId,
      capability,
      allowed: true,
    })))

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })
}

/**
 * Blocks self-elevation and demotion of the last protected owner.
 */
export async function assertMembershipRoleChange(
  context: WorkspaceContext,
  input: {
    membershipId: string
    targetUserId: string
    previousRoleId: string | null
    nextRoleId: string
    nextRole: OrganizationRoleRow
    previousRole?: OrganizationRoleRow | null
  },
) {
  if (input.nextRole.organization_id !== context.organization!.id) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Cargo não pertence a esta organização',
    })
  }

  if (input.targetUserId === context.userId) {
    const actorCaps = new Set<string>(context.capabilities)
    const { data: nextCaps } = await context.client
      .from('organization_role_capabilities')
      .select('capability, allowed')
      .eq('role_id', input.nextRoleId)

    const nextSet = new Set<string>(
      (nextCaps || []).filter((row: any) => row.allowed).map((row: any) => String(row.capability)),
    )

    for (const capability of nextSet) {
      if (!holdsCapability(actorCaps, capability)) {
        throw createError({
          statusCode: 403,
          statusMessage: 'Não é possível elevar o próprio privilégio',
        })
      }
    }

    for (const capability of actorCaps) {
      if (!holdsCapability(nextSet, capability) && capability.startsWith('organization.')) {
        // Losing org management while editing yourself is a demotion of self.
        if (capability === 'organization.team.manage' || capability === 'organization.roles.manage'
          || capability === 'organization.members.manage' || capability === 'organization.manage') {
          throw createError({
            statusCode: 403,
            statusMessage: 'Não é possível reduzir o próprio privilégio',
          })
        }
      }
    }
  }

  const previousWasProtected = input.previousRole?.is_protected === true
  const nextIsProtected = input.nextRole.is_protected === true

  if (previousWasProtected && !nextIsProtected) {
    const { count } = await context.client
      .from('organization_memberships')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', context.organization!.id)
      .eq('is_active', true)
      .eq('role_id', input.previousRoleId)

    if ((count ?? 0) <= 1) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Não é possível remover o último proprietário da organização',
      })
    }
  }
}

export async function assertCanDeactivateMembership(
  context: WorkspaceContext,
  membership: { id: string, user_id: string, role_id: string | null, is_active: boolean },
  role: OrganizationRoleRow | null,
) {
  if (membership.user_id === context.userId) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Não é possível desativar a si mesmo',
    })
  }

  if (role?.is_protected) {
    const { count } = await context.client
      .from('organization_memberships')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', context.organization!.id)
      .eq('is_active', true)
      .eq('role_id', membership.role_id)

    if ((count ?? 0) <= 1) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Não é possível remover o último proprietário da organização',
      })
    }
  }
}
