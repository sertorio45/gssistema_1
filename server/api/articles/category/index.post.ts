import { serverSupabaseServiceRole } from '#supabase/server'

import { createError, defineEventHandler, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  try {
    // Usar service role para cliente Supabase
    const client = await serverSupabaseServiceRole(event)

    // Ler o corpo da requisição
    const body = await readBody(event)

    // Tentar recuperar o tenant_id de diferentes formas
    let tenantId: string | null = null

    // 1. Verificar no corpo da requisição
    if (body.tenant_id) {
      tenantId = body.tenant_id
    }

    // 2. Verificar no contexto de autenticação
    if (!tenantId && event.context.auth?.tenantId) {
      tenantId = event.context.auth.tenantId
    }

    // 3. Se ainda não tiver, tentar recuperar do usuário autenticado
    if (!tenantId) {
      const {
        data: { user },
      } = await client.auth.getUser()

      if (user && user.user_metadata?.tenant_id) {
        tenantId = user.user_metadata.tenant_id
      }
    }

    // Se não conseguir recuperar o tenant_id, lançar erro
    if (!tenantId) {
      throw createError({
        statusCode: 400,
        message: 'Não foi possível identificar o tenant_id',
      })
    }

    // Preparar dados para inserção
    const categoryToInsert = {
      title: body.title,
      slug: body.slug,
      description: body.description,
      publish_status: body.publish_status || 'draft',
      tenant_id: tenantId,
    }

    // Validações básicas
    if (!categoryToInsert.title || !categoryToInsert.slug) {
      throw createError({
        statusCode: 400,
        message: 'Título e slug são obrigatórios',
      })
    }

    // Verificar se já existe uma categoria com o mesmo slug para este tenant
    const { data: existingCategory, error: existError } = await client
      .from('articles_category')
      .select('id')
      .eq('slug', categoryToInsert.slug)
      .eq('tenant_id', tenantId)
      .single()

    if (existError && existError.code !== 'PGRST116') {
      throw createError({
        statusCode: 500,
        message: 'Erro ao verificar categoria existente',
      })
    }

    if (existingCategory) {
      throw createError({
        statusCode: 409,
        message: 'Já existe uma categoria com este slug',
      })
    }

    // Inserir a categoria
    const { data, error } = await client.from('articles_category').insert([categoryToInsert]).select().single()

    if (error) {
      throw createError({
        statusCode: 500,
        message: error.message || 'Falha ao criar categoria',
      })
    }

    return {
      statusCode: 201,
      body: data,
    }
  }
  catch (error: any) {
    // Log detalhado do erro
    console.error('Erro na criação da categoria:', error)

    // Propagar o erro com detalhes
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Erro interno do servidor',
    })
  }
})
