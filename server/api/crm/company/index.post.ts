import { serverSupabaseServiceRole } from '#supabase/server'
import { createError, readBody } from 'h3'

import {
  assertUniqueCompanyName,
  companyAddressPayload,
} from '~/server/utils/crm-company'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body.tenant_id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Tenant ID é obrigatório',
    })
  }

  if (!body.name) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Nome da empresa é obrigatório',
    })
  }

  try {
    const supabase = serverSupabaseServiceRole(event)
    const name = await assertUniqueCompanyName(supabase, {
      tenantId: String(body.tenant_id),
      name: String(body.name),
    })

    const { data, error } = await supabase
      .from('crm_company')
      .insert([
        {
          name,
          website: body.website || null,
          ...companyAddressPayload(body),
          notes: body.notes || null,
          tenant_id: body.tenant_id,
        },
      ])
      .select()
      .single()

    if (error) {
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
      statusMessage: error.message || 'Falha ao criar empresa',
    })
  }
})
