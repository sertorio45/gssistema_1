import { serverSupabaseServiceRole } from '#supabase/server'
import { createError, defineEventHandler, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  try {
    const client = await serverSupabaseServiceRole(event)
    const body = await readBody(event)
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

    const pipelineToInsert = {
      name: body.name,
      description: body.description,
      is_default: false, // Custom sources are never default
      tenant_id: tenantId,
    }

    if (!pipelineToInsert.name) {
      throw createError({ statusCode: 400, message: 'Nome é obrigatório' })
    }

    const { data, error } = await client
      .from('crm_pipeline')
      .insert([pipelineToInsert])
      .select()
      .single()

    if (error) {
      throw createError({ statusCode: 500, message: error.message || 'Falha ao criar lead source' })
    }

    // Inserir stages padrão
    const defaultStages = [
      { name: 'New', order: 1, color: '#38bdf8', description: 'Initial stage', tenant_id: tenantId, pipeline_id: data.id, is_default: true },
      { name: 'Won', order: 99, color: '#22c55e', description: 'Deal won', tenant_id: tenantId, pipeline_id: data.id, is_default: true },
      { name: 'Lost', order: 100, color: '#ef4444', description: 'Deal lost', tenant_id: tenantId, pipeline_id: data.id, is_default: true },
    ]

    // Stages customizados do body
    const customStages = Array.isArray(body.customStages) ? body.customStages.map((stage, idx) => ({
      name: stage.name,
      order: idx + 2, // entre os defaults
      color: stage.color,
      description: stage.description || '',
      tenant_id: tenantId,
      pipeline_id: data.id,
      is_default: false,
    })) : []

    const allStages = [...defaultStages, ...customStages]

    const { data: stages, error: stageError } = await client
      .from('crm_sales_stage')
      .insert(allStages)
      .select()

    if (stageError) {
      throw createError({ statusCode: 500, message: stageError.message || 'Falha ao criar stages' })
    }

    return { statusCode: 201, body: { pipeline: data, stages } }
  }
  catch (error: any) {
    throw createError({ statusCode: error.statusCode || 500, message: error.message || 'Erro interno do servidor' })
  }
}) 