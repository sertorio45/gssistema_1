import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

import { isStaffRole } from '~/constants/roles'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user)
    throw createError({ statusCode: 401, statusMessage: 'Não autenticado' })

  const globalRole = (user.app_metadata as { role?: string })?.role
    || (user.user_metadata as { role?: string })?.role

  if (!isStaffRole(globalRole))
    throw createError({ statusCode: 403, statusMessage: 'Acesso negado' })

  const client = await serverSupabaseServiceRole(event)

  const { data, error } = await client
    .from('tenant')
    .select('id, name, slug, is_active, created_at, updated_at')
    .order('name')

  if (error)
    throw createError({ statusCode: 500, statusMessage: error.message })

  return { tenants: data || [] }
})
