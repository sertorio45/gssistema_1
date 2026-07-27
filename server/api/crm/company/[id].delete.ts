import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { getQuery, getRouterParam } from 'h3'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user)
    throw createError({ statusCode: 401, statusMessage: 'Não autenticado' })

  const companyId = getRouterParam(event, 'id')
  const query = getQuery(event)
  const tenantId = String(query.tenant_id || '')

  if (!companyId)
    throw createError({ statusCode: 400, statusMessage: 'ID da empresa é obrigatório' })

  if (!tenantId)
    throw createError({ statusCode: 400, statusMessage: 'Tenant ID é obrigatório' })

  const supabase = serverSupabaseServiceRole(event)

  const { data: existing, error: findError } = await supabase
    .from('crm_company')
    .select('id')
    .eq('id', companyId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (findError)
    throw createError({ statusCode: 400, statusMessage: findError.message })

  if (!existing)
    throw createError({ statusCode: 404, statusMessage: 'Empresa não encontrada' })

  const { error } = await supabase
    .from('crm_company')
    .delete()
    .eq('id', companyId)
    .eq('tenant_id', tenantId)

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  return { success: true }
})
