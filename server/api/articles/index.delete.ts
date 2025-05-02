import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
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
    
    // Validação básica do ID
    if (!body.id) {
      throw createError({
        statusCode: 400,
        message: 'ID do artigo não fornecido',
      })
    }

    const { error } = await supabase
      .from('article')
      .delete()
      .eq('id', body.id)

    if (error) {
      throw createError({
        statusCode: 500,
        message: error.message,
      })
    }

    return { success: true }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Erro ao excluir artigo',
    })
  }
})
