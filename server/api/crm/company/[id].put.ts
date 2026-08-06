import { serverSupabaseServiceRole } from '#supabase/server'
import { createError, getRouterParam, readBody } from 'h3'

import {
  assertUniqueCompanyName,
  companyAddressPayload,
} from '~/server/utils/crm-company'

export default defineEventHandler(async (event) => {
  const companyId = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (!companyId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID da empresa é obrigatório',
    })
  }

  if (!body.tenant_id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Tenant ID é obrigatório',
    })
  }

  try {
    const supabase = serverSupabaseServiceRole(event)

    const name = body.name
      ? await assertUniqueCompanyName(supabase, {
        tenantId: String(body.tenant_id),
        name: String(body.name),
        excludeId: companyId,
      })
      : undefined

    const { data, error } = await supabase
      .from('crm_company')
      .update({
        ...(name ? { name } : {}),
        website: body.website || null,
        ...companyAddressPayload(body),
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
          statusMessage: 'Empresa não encontrada',
        })
      }
      if (error.code === '23505') {
        throw createError({
          statusCode: 409,
          statusMessage: 'Já existe uma empresa com este nome neste ambiente',
        })
      }
      throw createError({
        statusCode: 400,
        statusMessage: error.message,
      })
    }

    return { data }
  }
  catch (error: any) {
    if (error.statusCode)
      throw error
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Falha ao atualizar empresa',
    })
  }
})
