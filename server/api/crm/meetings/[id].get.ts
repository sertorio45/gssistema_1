import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const meetingId = getRouterParam(event, 'id')
  const query = getQuery(event)
  const { tenant_id } = query

  if (!meetingId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Meeting ID is required',
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
    const { data, error } = await supabase
      .from('crm_meeting')
      .select('*, company:crm_company(name), contact:crm_contact(name), lead:crm_lead(name)')
      .eq('id', meetingId)
      .eq('tenant_id', tenant_id)
      .single()

    if (error) {
      throw createError({
        statusCode: 400,
        statusMessage: error.message,
      })
    }

    if (!data) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Meeting not found',
      })
    }

    const mapped = {
      ...data,
      company_name: data.company?.name || '',
      contact_name: data.contact?.name || '',
      lead_name: data.lead?.name || '',
    }

    return {
      data: mapped,
    }
  }
  catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch meeting',
    })
  }
}) 