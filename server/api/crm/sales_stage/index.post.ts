import { serverSupabaseServiceRole } from '#supabase/server'

import { createError, defineEventHandler, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  try {
    const client = await serverSupabaseServiceRole(event)
    const body = await readBody(event)
    let tenantId = body.tenant_id || event.context.auth?.tenantId
    if (!tenantId) {
      const {
        data: { user },
      } = await client.auth.getUser()
      if (user && user.user_metadata?.tenant_id) {
        tenantId = user.user_metadata.tenant_id
      }
    }
    if (!tenantId) {
      throw createError({ statusCode: 400, message: 'Não foi possível identificar o tenant_id' })
    }
    const stageToInsert = {
      name: body.name,
      order: body.order,
      color: body.color,
      description: body.description,
      tenant_id: tenantId,
      funnel_id: body.funnel_id,
    }
    if (!stageToInsert.name || !stageToInsert.order || !stageToInsert.color) {
      throw createError({ statusCode: 400, message: 'Nome, ordem e cor são obrigatórios' })
    }
    const { data, error } = await client.from('crm_sales_stage').insert([stageToInsert]).select().single()
    if (error) {
      throw createError({ statusCode: 500, message: error.message || 'Falha ao criar sales stage' })
    }
    return { statusCode: 201, body: data }
  }
  catch (error) {
    throw createError({ statusCode: error.statusCode || 500, message: error.message || 'Erro interno do servidor' })
  }
})
