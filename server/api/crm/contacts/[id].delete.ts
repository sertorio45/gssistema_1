import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const contactId = getRouterParam(event, 'id')
  const query = getQuery(event)
  const { tenant_id } = query

  if (!contactId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID do contato é obrigatório',
    })
  }

  if (!tenant_id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Tenant ID é obrigatório',
    })
  }

  try {
    const supabase = serverSupabaseServiceRole(event)

    const { data: deleted, error } = await supabase
      .from('crm_contact')
      .delete()
      .eq('id', contactId)
      .eq('tenant_id', tenant_id)
      .select('id')
      .maybeSingle()

    if (error) {
      throw createError({
        statusCode: 400,
        statusMessage: error.message,
      })
    }

    if (!deleted) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Contato não encontrado',
      })
    }

    return {
      success: true,
    }
  }
  catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Falha ao excluir contato',
    })
  }
})
