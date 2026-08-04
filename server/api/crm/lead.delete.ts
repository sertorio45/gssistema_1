import { serverSupabaseServiceRole } from '#supabase/server'
import { createError, defineEventHandler, getQuery, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  try {
    const client = serverSupabaseServiceRole(event)
    const query = getQuery(event)
    const body = await readBody(event).catch(() => ({} as Record<string, unknown>))

    const id = String(body?.id || query.id || '')
    let tenantId = String(body?.tenant_id || query.tenant_id || event.context.auth?.tenantId || '')

    if (!tenantId) {
      const {
        data: { user },
      } = await client.auth.getUser()
      if (user?.user_metadata?.tenant_id)
        tenantId = String(user.user_metadata.tenant_id)
    }

    if (!id) {
      throw createError({ statusCode: 400, statusMessage: 'ID é obrigatório' })
    }
    if (!tenantId) {
      throw createError({ statusCode: 400, statusMessage: 'Não foi possível identificar o tenant_id' })
    }

    const { data: deleted, error } = await client.from('crm_lead').delete().eq('id', id).eq('tenant_id', tenantId).select('id').maybeSingle()
    if (error) {
      throw createError({ statusCode: 500, statusMessage: error.message || 'Falha ao remover lead' })
    }
    if (!deleted) {
      throw createError({ statusCode: 404, statusMessage: 'Lead não encontrado' })
    }

    return { success: true, message: 'Removido com sucesso' }
  }
  catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || error.message || 'Erro interno do servidor',
    })
  }
})
