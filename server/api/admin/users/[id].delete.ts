import process from 'node:process'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  try {
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
      throw new Error('ID do usuário não fornecido')
    }

    const { error } = await supabase.auth.admin.deleteUser(id)
    
    if (error) {
      throw error
    }

    return {
      success: true,
      message: 'Usuário excluído com sucesso',
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Erro ao excluir usuário',
    }
  }
}) 