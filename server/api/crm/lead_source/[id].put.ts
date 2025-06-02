import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  try {
    const user = await serverSupabaseUser(event)
    if (!user) {
      throw createError({ statusCode: 401, message: 'Unauthorized' })
    }
    const client = await serverSupabaseServiceRole(event)
    const id = getRouterParam(event, 'id')
    if (!id) {
      throw createError({ statusCode: 400, message: 'ID do source é obrigatório' })
    }
    const body = await readBody(event)
    // Buscar tenantId do contexto ou body
    let tenantId = body.tenant_id || event.context.auth?.tenantId
    if (!tenantId) {
      const { data: { user } } = await client.auth.getUser()
      if (user && user.user_metadata?.tenant_id) {
        tenantId = user.user_metadata.tenant_id
      }
    }
    if (!tenantId) {
      throw createError({ statusCode: 400, message: 'Não foi possível identificar o tenant_id' })
    }
    // Verificar se o registro existe e pertence ao tenant
    const { data: existing, error: existError } = await client
      .from('crm_lead_source_table')
      .select('id, tenant_id')
      .eq('id', id)
      .single()
    if (existError || !existing) {
      throw createError({ statusCode: 404, message: 'Source não encontrado' })
    }
    if (existing.tenant_id !== tenantId) {
      throw createError({ statusCode: 403, message: 'Acesso negado ao source' })
    }
    // Atualizar apenas campos permitidos
    const updateData = {
      name: body.name,
      description: body.description,
    }
    const { data, error } = await client
      .from('crm_lead_source_table')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()
    if (error) {
      throw createError({ statusCode: 500, message: error.message || 'Falha ao atualizar lead source' })
    }
    return { statusCode: 200, body: data }
  }
  catch (error: any) {
    throw createError({ statusCode: error.statusCode || 500, message: error.message || 'Erro interno do servidor' })
  }
}) 