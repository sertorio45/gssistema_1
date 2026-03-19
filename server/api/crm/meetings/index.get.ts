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
      .from('crm_meeting')
      .select('*, company:crm_company(name), contact:crm_contact(name), lead:crm_lead(name)', { count: 'exact' })
      .eq('tenant_id', tenant_id)
      .order('start_time', { ascending: false })

    if (search) {
      req = req.ilike('title', `%${search}%`)
    }

    const { data, error, count } = await req.range(from, to)

    if (error) {
      throw createError({
        statusCode: 400,
        statusMessage: error.message,
      })
    }

    // Mapear nomes para exibição
    const mapped = (data || []).map((m: any) => ({
      ...m,
      company_name: m.company?.name || '',
      contact_name: m.contact?.name || '',
      lead_name: m.lead?.name || '',
    }))

    return {
      data: mapped,
      total: count || 0,
      page: Number(page),
      limit: Number(limit),
    }
  }
  catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch meetings',
    })
  }
})
