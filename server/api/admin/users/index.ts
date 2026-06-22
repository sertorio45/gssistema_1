import { createClient } from '@supabase/supabase-js'
import { createError } from 'h3'

import {
  requireStaffUser,
} from '~/server/utils/admin-auth'

export default defineEventHandler(async (event) => {
  await requireStaffUser(event)

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )

  const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers()
  const { data: rolesData, error: rolesError } = await supabase
    .from('user_tenant_role')
    .select('user_id, tenant_id, role')
  const { data: tenantsData, error: tenantsError } = await supabase
    .from('tenant')
    .select('id, name')

  if (usersError || rolesError || tenantsError) {
    throw createError({
      statusCode: 500,
      statusMessage: usersError?.message || rolesError?.message || tenantsError?.message,
    })
  }

  const tenantsById = new Map((tenantsData || []).map(t => [t.id, t.name]))

  const users = usersData.users.map((user) => {
    const membership = (rolesData || []).find(role => role.user_id === user.id)
    const globalRole = (user.app_metadata as { role?: string })?.role
      || (user.user_metadata as { role?: string })?.role
    const role = globalRole || membership?.role || 'cliente'
    const tenantId = membership?.tenant_id || null

    return {
      id: user.id,
      email: user.email,
      role,
      tenant_id: tenantId,
      tenant_name: tenantId ? tenantsById.get(tenantId) || null : null,
    }
  })

  return { users }
})
