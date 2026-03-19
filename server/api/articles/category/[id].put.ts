import { serverSupabaseServiceRole } from '#supabase/server'

import { createError, defineEventHandler, getQuery, getRouterParam, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  try {
    // Cliente Supabase com service role
    const client = await serverSupabaseServiceRole(event)

    // Obter ID do artigo da rota
    const id = getRouterParam(event, 'id')
    if (!id) {
      throw createError({
        statusCode: 400,
        message: 'ID da categoria é obrigatório',
      })
    }

    // Ler corpo da requisição
    const body = await readBody(event)

    // Validar dados de entrada
    const validationErrors = validateArticleUpdate(body)
    if (validationErrors.length > 0) {
      throw createError({
        statusCode: 400,
        message: `Erros de validação: ${validationErrors.join(', ')}`,
      })
    }

    // Tentar recuperar o tenant_id de diferentes formas
    let tenantId: string | null = null
    // 1. Verificar no corpo da requisição
    if (body.tenant_id) {
      tenantId = body.tenant_id
    }
    // 2. Verificar na query string
    if (!tenantId) {
      const queryTenantId = getQuery(event).tenant_id
      if (queryTenantId)
        tenantId = queryTenantId
    }
    // 3. Verificar no contexto de autenticação
    if (!tenantId && event.context.auth?.tenantId) {
      tenantId = event.context.auth.tenantId
    }
    // 4. Se ainda não tiver, tentar recuperar do usuário autenticado
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

    // Verificar se o artigo pertence ao tenant
    const { data: existingArticle, error: existError } = await client
      .from('articles_category')
      .select('id, tenant_id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (existError || !existingArticle) {
      throw createError({
        statusCode: 404,
        message: 'Artigo não encontrado ou sem permissão de acesso',
      })
    }

    // Preparar dados para atualização
    const articleCategoryToUpdate = {
      title: body.title,
      slug: body.slug,
      description: body.description,
      publish_status: body.publish_status || 'draft',
      tenant_id: tenantId,
    }

    // Atualizar artigo
    const { data, error } = await client
      .from('articles_category')
      .update(articleCategoryToUpdate)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error || !data) {
      throw createError({
        statusCode: 500,
        message: error?.message || 'Erro ao atualizar artigo',
      })
    }

    return {
      statusCode: 200,
      body: data,
    }
  }
  catch (error: any) {
    // Log detalhado do erro
    console.error('Erro na atualização do artigo:', error)

    // Propagar o erro com detalhes
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Erro interno do servidor',
    })
  }
})

// Função de validação dos dados de entrada
function validateArticleUpdate(data: any): string[] {
  const errors: string[] = []

  // Validar título
  if (!data.title || data.title.trim() === '') {
    errors.push('Título é obrigatório')
  }

  return errors
}
