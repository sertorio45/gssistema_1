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
    const id = event.context.params?.id

    if (!id) {
      throw createError({
        statusCode: 400,
        message: 'ID do artigo não fornecido',
      })
    }

    const { data, error } = await supabase
      .from('article')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      throw createError({
        statusCode: 500,
        message: error.message,
      })
    }

    if (!data) {
      throw createError({
        statusCode: 404,
        message: 'Artigo não encontrado',
      })
    }

    return { article: data }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Erro ao buscar artigo',
    })
  }
}) 