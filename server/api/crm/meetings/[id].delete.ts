import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const meetingId = getRouterParam(event, 'id')
  const query = getQuery(event)
  const { tenant_id } = query

  if (!meetingId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID da reunião é obrigatório',
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
      .from('crm_meeting')
      .delete()
      .eq('id', meetingId)
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
        statusMessage: 'Reunião não encontrada',
      })
    }

    return {
      success: true,
    }
  }
  catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Falha ao excluir reunião',
    })
  }
})
