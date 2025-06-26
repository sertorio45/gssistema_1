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
      throw createError({ statusCode: 400, message: 'ID do pipeline é obrigatório' })
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
      .from('crm_pipeline')
      .select('id, tenant_id')
      .eq('id', id)
      .single()
    if (existError || !existing) {
      throw createError({ statusCode: 404, message: 'Pipeline não encontrado' })
    }
    if (existing.tenant_id !== tenantId) {
      throw createError({ statusCode: 403, message: 'Acesso negado ao pipeline' })
    }
    // Atualizar apenas campos permitidos
    const updateData = {
      name: body.name,
      description: body.description,
    }
    const { data: pipeline, error } = await client
      .from('crm_pipeline')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()
    if (error) {
      throw createError({ statusCode: 500, message: error.message || 'Falha ao atualizar pipeline' })
    }

    // --- Atualizar stages customizados ---
    const customStages = Array.isArray(body.customStages) ? body.customStages : []

    // Buscar todos os customStages atuais desse pipeline
    const { data: currentStages, error: fetchStagesError } = await client
      .from('crm_sales_stage')
      .select('id')
      .eq('pipeline_id', id)
      .eq('is_default', false)
      .eq('tenant_id', tenantId)
    if (fetchStagesError) {
      throw createError({ statusCode: 500, message: fetchStagesError.message || 'Erro ao buscar stages atuais' })
    }

    const currentIds = (currentStages || []).map((s: any) => s.id)
    const sentIds = customStages.filter((s: any) => s.id).map((s: any) => s.id)
    // Deletar os que não vieram no payload
    const toDelete = currentIds.filter(id => !sentIds.includes(id))
    if (toDelete.length > 0) {
      const { error: delError } = await client
        .from('crm_sales_stage')
        .delete()
        .in('id', toDelete)
        .eq('tenant_id', tenantId)
      if (delError) {
        throw createError({ statusCode: 500, message: delError.message || 'Erro ao remover stages antigos' })
      }
    }
    // Atualizar ou inserir os enviados
    for (const [idx, stage] of customStages.entries()) {
      // Validar se o stage tem nome válido
      if (!stage.name || !stage.name.trim()) {
        continue // Pular stages sem nome
      }

      if (stage.id) {
        // Update
        const updateObj: any = {
          name: stage.name.trim(),
          order: stage.order || idx + 2,
          description: stage.description || '',
        }
        if (stage.color) {
          updateObj.color = stage.color
        }
        const { error: updError } = await client
          .from('crm_sales_stage')
          .update(updateObj)
          .eq('id', stage.id)
          .eq('tenant_id', tenantId)
        if (updError) {
          throw createError({ statusCode: 500, message: updError.message || 'Erro ao atualizar stage' })
        }
      }
      else {
        // Insert
        const insertObj = {
          name: stage.name.trim(),
          order: stage.order || idx + 2,
          description: stage.description || '',
          color: stage.color || '#cccccc',
          tenant_id: tenantId,
          pipeline_id: id,
          is_default: false,
        }
        const { error: insError } = await client
          .from('crm_sales_stage')
          .insert(insertObj)
        if (insError) {
          throw createError({ statusCode: 500, message: insError.message || 'Erro ao criar novo stage' })
        }
      }
    }
    // Buscar todos os stages atualizados
    const { data: stages, error: stagesError } = await client
      .from('crm_sales_stage')
      .select('*')
      .eq('pipeline_id', id)
      .eq('tenant_id', tenantId)
      .order('is_default', { ascending: false })
      .order('order')
    if (stagesError) {
      throw createError({ statusCode: 500, message: stagesError.message || 'Erro ao buscar stages atualizados' })
    }
    return { statusCode: 200, body: { pipeline, stages } }
  }
  catch (error: any) {
    throw createError({ statusCode: error.statusCode || 500, message: error.message || 'Erro interno do servidor' })
  }
})