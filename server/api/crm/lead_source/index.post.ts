import { serverSupabaseServiceRole } from '#supabase/server'
import { defineEventHandler, readBody, createError } from 'h3'

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

    const sourceToInsert = {
      name: body.name,
      description: body.description,
      is_default: false, // Custom sources are never default
      tenant_id: tenantId,
    }

    if (!sourceToInsert.name) {
      throw createError({ statusCode: 400, message: 'Nome é obrigatório' })
    }

    const { data, error } = await client
      .from('crm_lead_source_table')
      .insert([sourceToInsert])
      .select()
      .single()

    if (error) {
      throw createError({ statusCode: 500, message: error.message || 'Falha ao criar lead source' })
    }

    return { statusCode: 201, body: data }
  }
  catch (error) {
    throw createError({ statusCode: error.statusCode || 500, message: error.message || 'Erro interno do servidor' })
  }
}) 