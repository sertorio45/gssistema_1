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
    
    // Validação básica dos campos obrigatórios
    if (!body.title || !body.slug || !body.content || !body.description) {
      throw createError({
        statusCode: 400,
        message: 'Campos obrigatórios não preenchidos',
      })
    }

    const { data, error } = await supabase
      .from('article')
      .insert({
        title: body.title,
        slug: body.slug,
        content: body.content,
        meta_description: body.description,
        status: body.status || 'draft',
        tag_id: null,
        category_id: null,
        tenant_id: 1,
        created_at: new Date().toISOString(),
        updated_at: null,
      })

    if (error) {
      throw createError({
        statusCode: 500,
        message: error.message,
      })
    }

    return { data }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Erro ao criar artigo',
    })
  }
})
