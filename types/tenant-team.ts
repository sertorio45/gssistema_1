import type { AppRoleSlug } from '~/constants/roles'
import { ROLE_LABELS } from '~/constants/roles'

export type TenantTeamRole = AppRoleSlug

/** `pending` until the invitee signs in for the first time. */
export type TenantTeamMemberStatus = 'pending' | 'active'

export interface TenantTeamMember {
  id: string
  userId: string
  tenantId: string
  role: TenantTeamRole
  email: string
  name: string
  status: TenantTeamMemberStatus
  lastSignInAt: string | null
  createdAt: string
  updatedAt: string
}

export const TENANT_TEAM_ROLE_LABELS = ROLE_LABELS
