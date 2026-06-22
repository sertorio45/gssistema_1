import { createError } from 'h3'

import { serverSupabaseUser } from '#supabase/server'

import {
  isStaffRole,
  type AppRoleSlug,
} from '~/constants/roles'
import { isStaffUser, resolveStaffRole } from '~/server/utils/tenant-role'

export type AdminCreatableRole = AppRoleSlug

export async function requireAuthenticatedUser(event: any) {
  const user = await serverSupabaseUser(event)
  if (!user)
    throw createError({ statusCode: 401, statusMessage: 'Não autenticado' })
  return user
}

export async function requireStaffUser(event: any) {
  const user = await requireAuthenticatedUser(event)
  if (!isStaffUser(user))
    throw createError({ statusCode: 403, statusMessage: 'Acesso negado' })
  return user
}

export function resolveActorStaffRole(user: { app_metadata?: any, user_metadata?: any }): 'admin' | 'funcionario' {
  return resolveStaffRole(user)
}

/** Roles that the actor may create in /admin/users */
export function resolveAdminCreatableRoles(actorRole: 'admin' | 'funcionario'): AdminCreatableRole[] {
  if (actorRole === 'admin')
    return ['admin', 'funcionario', 'cliente', 'atendente']
  return ['cliente', 'atendente']
}

export function assertAdminCanAssignRole(actorRole: 'admin' | 'funcionario', targetRole: AdminCreatableRole) {
  const allowed = resolveAdminCreatableRoles(actorRole)
  if (!allowed.includes(targetRole)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Você não tem permissão para criar usuários com esta função',
    })
  }
}

export function isGlobalStaffRole(role?: string | null) {
  return isStaffRole(role)
}
