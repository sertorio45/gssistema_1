// server/api/admin/users.ts
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async () => {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!, // 🔐 NUNCA use isso no frontend
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )

  const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers()
  const { data: rolesData, error: rolesError } = await supabase.from('user_tenant_role').select()

  if (usersError || rolesError) {
    return { error: usersError?.message || rolesError?.message }
  }

  // Combina dados de usuários e roles
  const users = usersData.users.map((user) => {
    const role = rolesData.find(role => role.user_id === user.id)
    return {
      id: user.id,
      email: user.email,
      role: role ? role.role : 'cliente',
    }
  })

  return { users }
})
