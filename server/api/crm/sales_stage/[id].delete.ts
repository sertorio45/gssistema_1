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
    const { data: deleted, error } = await client
      .from('crm_sales_stage')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenant_id)
      .select('id')
      .maybeSingle()

    if (error) {
      throw createError({ statusCode: 500, statusMessage: error.message || 'Falha ao remover sales stage' })
    }
    if (!deleted) {
      throw createError({ statusCode: 404, statusMessage: 'Estágio não encontrado' })
    }
    return { success: true, message: 'Removido com sucesso' }
  }
  catch (err: any) {
    throw createError({ statusCode: err.statusCode || 500, message: err.message || 'Erro interno do servidor' })
  }
})
