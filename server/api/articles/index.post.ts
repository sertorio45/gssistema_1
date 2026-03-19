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
    const articleToInsert = {
      title: body.title,
      slug: body.slug,
      content: body.content,
      meta_description: body.meta_description,
      publish_status: body.publish_status || 'draft',
      tenant_id: tenantId,
    }

    // Validações básicas
    if (!articleToInsert.title || !articleToInsert.slug) {
      throw createError({
        statusCode: 400,
        message: 'Título e slug são obrigatórios',
      })
    }

    // Verificar se já existe um artigo com o mesmo slug para este tenant
    const { data: existingArticle, error: existError } = await client
      .from('articles')
      .select('id')
      .eq('slug', articleToInsert.slug)
      .eq('tenant_id', tenantId)
      .single()

    if (existError && existError.code !== 'PGRST116') {
      throw createError({
        statusCode: 500,
        message: 'Erro ao verificar artigo existente',
      })
    }

    if (existingArticle) {
      throw createError({
        statusCode: 409,
        message: 'Já existe um artigo com este slug',
      })
    }

    // Inserir o artigo
    const { data, error } = await client.from('articles').insert([articleToInsert]).select().single()

    if (error) {
      throw createError({
        statusCode: 500,
        message: error.message || 'Falha ao criar artigo',
      })
    }

    return {
      statusCode: 201,
      body: data,
    }
  }
  catch (error: any) {
    // Log detalhado do erro
    console.error('Erro na criação do artigo:', error)

    // Propagar o erro com detalhes
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Erro interno do servidor',
    })
  }
})
