import { serverSupabaseServiceRole } from '#supabase/server'

import { createError, defineEventHandler, getQuery } from 'h3'

export default defineEventHandler(async (event) => {
  try {
    const client = await serverSupabaseServiceRole(event)
    const id = event.context.params?.id
    const { tenant_id } = getQuery(event)
    if (!id) {
      throw createError({ statusCode: 400, message: 'ID é obrigatório' })
    }
    if (!tenant_id) {
      throw createError({ statusCode: 400, message: 'tenant_id é obrigatório' })
    }
    const { error } = await client.from('crm_funnel').delete().eq('id', id).eq('tenant_id', tenant_id)
    if (error) {
      throw createError({ statusCode: 500, message: error.message || 'Falha ao remover funil' })
    }
    return { statusCode: 200, message: 'Removido com sucesso' }
  }
  catch (err: any) {
    throw createError({ statusCode: err.statusCode || 500, message: err.message || 'Erro interno do servidor' })
  }
})
