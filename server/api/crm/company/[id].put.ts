import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const companyId = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (!companyId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Company ID is required',
    })
  }

  if (!body.tenant_id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Tenant ID is required',
    })
  }

  try {
    const supabase = serverSupabaseServiceRole(event)

    const { data, error } = await supabase
      .from('crm_company')
      .update({
        name: body.name,
        website: body.website || null,
        industry: body.industry || null,
        size: body.size || null,
        address: body.address || null,
        cep: body.cep || null,
        city: body.city || null,
        country: body.country || null,
        notes: body.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', companyId)
      .eq('tenant_id', body.tenant_id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw createError({
          statusCode: 404,
          statusMessage: 'Company not found',
        })
      }
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
    if (error.statusCode) {
      throw error
    }
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to update company',
    })
  }
})
