import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body.tenant_id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Tenant ID is required',
    })
  }

  if (!body.name) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Company name is required',
    })
  }

  try {
    const supabase = serverSupabaseServiceRole(event)

    const { data, error } = await supabase
      .from('crm_company')
      .insert([
        {
          name: body.name,
          website: body.website || null,
          industry: body.industry || null,
          size: body.size || null,
          address: body.address || null,
          cep: body.cep || null,
          city: body.city || null,
          country: body.country || null,
          notes: body.notes || null,
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
      statusMessage: error.message || 'Failed to create company',
    })
  }
}) 