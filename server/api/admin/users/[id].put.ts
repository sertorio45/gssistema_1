import process from 'node:process'
import { createClient } from '@supabase/supabase-js'
import { readBody } from 'h3'

export default defineEventHandler(async (event) => {
  try {
    // Usando a service role key para ter acesso admin
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

    // Pegar ID da URL
    const id = event.context.params?.id
    if (!id) {
      return {
        success: false,
        error: 'ID do usuário não fornecido',
      }
    }

    // Pegar dados do body
    const body = await readBody(event)

    // Se tiver senha, atualiza apenas a senha primeiro
    if (body.password && body.password.trim() !== '') {
      const { error: passwordError } = await supabase.auth.admin.updateUserById(
        id,
        { password: body.password },
      )

      if (passwordError) {
        return {
          success: false,
          error: passwordError.message,
        }
      }
    }

    // Se tiver email, atualiza o email em uma chamada separada
    if (body.email) {
      const { error: emailError } = await supabase.auth.admin.updateUserById(
        id,
        {
          email: body.email,
          email_confirm: true,
        },
      )

      if (emailError) {
        return {
          success: false,
          error: emailError.message,
        }
      }
    }

    return {
      success: true,
      message: 'Usuário atualizado com sucesso',
    }
  }
  catch (error: any) {
    return {
      success: false,
      error: error.message || 'Erro ao atualizar usuário',
    }
  }
}) 