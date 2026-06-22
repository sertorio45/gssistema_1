import process from 'node:process'

import { createClient } from '@supabase/supabase-js'
import { createError, readBody } from 'h3'

import { requireStaffUser } from '~/server/utils/admin-auth'

export default defineEventHandler(async (event) => {
  await requireStaffUser(event)

  try {
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const id = event.context.params?.id
    if (!id)
      throw createError({ statusCode: 400, statusMessage: 'ID do usuário não fornecido' })

    const body = await readBody(event)

    if (body.password && body.password.trim() !== '') {
      const { error: passwordError } = await supabase.auth.admin.updateUserById(id, { password: body.password })
      if (passwordError)
        throw createError({ statusCode: 400, statusMessage: passwordError.message })
    }

    if (body.email) {
      const { error: emailError } = await supabase.auth.admin.updateUserById(id, {
        email: body.email,
        email_confirm: true,
      })
      if (emailError)
        throw createError({ statusCode: 400, statusMessage: emailError.message })
    }

    return {
      success: true,
      message: 'Usuário atualizado com sucesso',
    }
  }
  catch (error: any) {
    if (error?.statusCode)
      throw error

    return {
      success: false,
      error: error.message || 'Erro ao atualizar usuário',
    }
  }
})
