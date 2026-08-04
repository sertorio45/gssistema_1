import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const companyId = getRouterParam(event, 'id')
  const query = getQuery(event)
  const tenantId = query.tenant_id

  if (!companyId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Company ID is required',
    })
  }

  if (!tenantId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Tenant ID is required',
    })
  }

  const supabase = serverSupabaseServiceRole(event)

  const { data, error } = await supabase
    .from('crm_company')
    .select('*')
    .eq('id', companyId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (error) {
    throw createError({
      statusCode: 400,
      statusMessage: error.message,
    })
  }

  if (!data) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Company not found',
    })
  }

  return { data }
})
