import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const { tenant_id, page = 1, limit = 20, search = '' } = query

  if (!tenant_id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Tenant ID is required',
    })
  }

  try {
    const supabase = serverSupabaseServiceRole(event)
    const from = (Number(page) - 1) * Number(limit)
    const to = from + Number(limit) - 1

    let req = supabase
      .from('crm_lead')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenant_id)
      .order('created_at', { ascending: false })

    if (search) {
      req = req.ilike('name', `%${search}%`)
    }

    const { data, error, count } = await req.range(from, to)

    if (error) {
      throw createError({
        statusCode: 400,
        statusMessage: error.message,
      })
    }

    return {
      data: data || [],
      total: count || 0,
      page: Number(page),
      limit: Number(limit),
    }
  }
  catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch leads',
    })
  }
})
