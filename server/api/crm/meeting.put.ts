import { serverSupabaseServiceRole } from '#supabase/server'
import { defineEventHandler, readBody, createError } from 'h3'

export default defineEventHandler(async (event) => {
  try {
    const client = await serverSupabaseServiceRole(event)
    const body = await readBody(event)
    if (!body.id) throw createError({ statusCode: 400, message: 'ID é obrigatório' })
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
    const updateData = { ...body }
    delete updateData.id
    const { data, error } = await client.from('crm_meeting').update(updateData).eq('id', body.id).eq('tenant_id', tenantId).select().single()
    if (error) {
      throw createError({ statusCode: 500, message: error.message || 'Falha ao atualizar meeting' })
    }
    return { statusCode: 200, body: data }
  } catch (error) {
    throw createError({ statusCode: error.statusCode || 500, message: error.message || 'Erro interno do servidor' })
  }
}) 