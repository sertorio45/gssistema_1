import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const contactId = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (!contactId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Contact ID is required',
    })
  }

  if (!body.tenant_id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Tenant ID is required',
    })
  }

  if (!body.name) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Contact name is required',
    })
  }

  if (!body.email) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Email is required',
    })
  }

  try {
    const supabase = serverSupabaseServiceRole(event)

    const { data, error } = await supabase
      .from('crm_contact')
      .update({
        name: body.name,
        email: body.email,
        phone: body.phone || null,
        position: body.position || null,
        company_id: body.company_id || null,
        notes: body.notes || null,
        tags: body.tags || [],
        updated_at: new Date().toISOString(),
      })
      .eq('id', contactId)
      .eq('tenant_id', body.tenant_id)
      .select()
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
        statusMessage: 'Contact not found',
      })
    }

    return {
      data,
    }
  }
  catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to update contact',
    })
  }
})
