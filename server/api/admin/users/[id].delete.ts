import process from 'node:process'

import { createClient } from '@supabase/supabase-js'
import { createError } from 'h3'

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

    const { error } = await supabase.auth.admin.deleteUser(id)
    if (error)
      throw createError({ statusCode: 400, statusMessage: error.message })

    return {
      success: true,
      message: 'Usuário excluído com sucesso',
    }
  }
  catch (error: any) {
    if (error?.statusCode)
      throw error

    return {
      success: false,
      error: error.message || 'Erro ao excluir usuário',
    }
  }
})
