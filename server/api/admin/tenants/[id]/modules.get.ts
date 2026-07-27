import { getRouterParam } from 'h3'

import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

import { isStaffRole } from '~/constants/roles'
import { getTenantModulesState } from '~/server/utils/tenant-modules'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user)
    throw createError({ statusCode: 401, statusMessage: 'Não autenticado' })

  const globalRole = (user.app_metadata as { role?: string })?.role
    || (user.user_metadata as { role?: string })?.role

  if (!isStaffRole(globalRole))
    throw createError({ statusCode: 403, statusMessage: 'Acesso negado' })

  const tenantId = String(getRouterParam(event, 'id'))
  const client = await serverSupabaseServiceRole(event)

  const { data: tenant, error: tenantError } = await client
    .from('tenant')
    .select('id, name, slug')
    .eq('id', tenantId)
    .maybeSingle()

  if (tenantError)
    throw createError({ statusCode: 400, statusMessage: tenantError.message })
  if (!tenant)
    throw createError({ statusCode: 404, statusMessage: 'Empresa não encontrada' })

  const modules = await getTenantModulesState(client, tenantId)

  return {
    tenant,
    ...modules,
  }
})
