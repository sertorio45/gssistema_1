import process from 'node:process'
// server/api/admin/users.ts
import { createClient } from '@supabase/supabase-js'
import { readBody } from 'h3'

export default defineEventHandler(async (event) => {
  // Inicializar cliente Supabase com service role key
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

  try {
    const body = await readBody(event)
    const { email, password, name } = body

    // Criar usuário usando a API admin do Supabase
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
      },
    })

    if (createError) {
      console.error('Erro ao criar usuário:', createError)
      throw createError
    }

    return {
      success: true,
      message: 'Usuário criado com sucesso',
      user: newUser,
    }
  }
  catch (error: any) {
    return {
      success: false,
      error: error.message || 'Erro ao criar usuário',
    }
  }
})
