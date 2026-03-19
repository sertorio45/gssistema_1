import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body.tenant_id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Tenant ID is required',
    })
  }

  if (!body.title) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Meeting title is required',
    })
  }

  try {
    const supabase = serverSupabaseServiceRole(event)

    const { data, error } = await supabase
      .from('crm_meeting')
      .insert([
        {
          title: body.title,
          description: body.description || null,
          start_time: body.start_time,
          end_time: body.end_time,
          location: body.location || null,
          type: body.type,
          status: body.status,
          attendees: body.attendees || [],
          lead_id: body.lead_id || null,
          contact_id: body.contact_id || null,
          company_id: body.company_id || null,
          notes: body.notes || null,
          outcome: body.outcome || null,
          created_by: body.created_by || '',
          tenant_id: body.tenant_id,
        },
      ])
      .select()
      .single()

    if (error) {
      throw createError({
        statusCode: 400,
        statusMessage: error.message,
      })
    }

    return {
      data,
    }
  }
  catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to create meeting',
    })
  }
})
