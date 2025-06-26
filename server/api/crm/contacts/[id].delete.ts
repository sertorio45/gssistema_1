import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const contactId = getRouterParam(event, 'id')
  const query = getQuery(event)
  const { tenant_id } = query

  if (!contactId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Contact ID is required',
    })
  }

  if (!tenant_id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Tenant ID is required',
    })
  }

  try {
    const supabase = serverSupabaseServiceRole(event)

    const { error } = await supabase
      .from('crm_contact')
      .delete()
      .eq('id', contactId)
      .eq('tenant_id', tenant_id)

    if (error) {
      throw createError({
        statusCode: 400,
        statusMessage: error.message,
      })
    }

    return {
      success: true,
    }
  }
  catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to delete contact',
    })
  }
}) 