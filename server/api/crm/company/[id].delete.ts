import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const companyId = getRouterParam(event, 'id')
  const query = getQuery(event)
  const { tenant_id } = query

  if (!companyId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Company ID is required',
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
      .from('crm_company')
      .select('*')
      .eq('id', companyId)
      .eq('tenant_id', tenant_id)
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
      statusMessage: error.message || 'Failed to fetch company',
    })
  }
}) 