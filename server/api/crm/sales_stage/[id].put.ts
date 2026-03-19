import { serverSupabaseServiceRole } from '#supabase/server'

import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  try {
    const client = await serverSupabaseServiceRole(event)
    const body = await readBody(event)
    const id = getRouterParam(event, 'id') || body?.id
    if (!id)
      throw createError({ statusCode: 400, message: 'ID é obrigatório' })
    let tenantId = body?.tenant_id || event.context.auth?.tenantId
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
    // Atualiza apenas campos permitidos (evita sobrescrever id/tenant_id acidentalmente)
    const updateData: Record<string, unknown> = {}
    const orderVal = body?.order !== undefined ? Number(body.order) : undefined
    if (orderVal !== undefined && !Number.isNaN(orderVal))
      updateData.order = orderVal
    if (body?.name !== undefined)
      updateData.name = body.name
    if (body?.color !== undefined)
      updateData.color = body.color
    if (body?.description !== undefined)
      updateData.description = body.description
    if (Object.keys(updateData).length === 0) {
      throw createError({ statusCode: 400, message: 'Nenhum campo válido para atualizar' })
    }
    const { data, error } = await client
      .from('crm_sales_stage')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .maybeSingle()
    if (error) {
      throw createError({ statusCode: 500, message: error.message || 'Falha ao atualizar sales stage' })
    }
    if (!data) {
      throw createError({ statusCode: 404, message: 'Estágio não encontrado ou sem permissão para este tenant' })
    }
    return { statusCode: 200, body: data }
  }
  catch (error: any) {
    const status = error.statusCode || error.status || 500
    const message = error.message || error.data?.message || 'Erro interno do servidor'
    throw createError({ statusCode: status, message })
  }
})
