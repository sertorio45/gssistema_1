import { ROLE_LABELS, type AppRoleSlug } from '~/constants/roles'

export type TenantTeamRole = AppRoleSlug

export interface TenantTeamMember {
  id: string
  userId: string
  tenantId: string
  role: TenantTeamRole
  email: string
  name: string
  createdAt: string
  updatedAt: string
}

export const TENANT_TEAM_ROLE_LABELS = ROLE_LABELS
