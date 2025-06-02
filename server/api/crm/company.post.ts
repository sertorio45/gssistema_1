import { serverSupabaseServiceRole } from '#supabase/server'
import { defineEventHandler, readBody, createError } from 'h3'

export default defineEventHandler(async (event) => {
  try {
    const client = await serverSupabaseServiceRole(event)
    const body = await readBody(event)
    let tenantId = body.tenant_id || event.context.auth?.tenantId
    if (!tenantId) {
      const { data: { user } } = await client.auth.getUser()
      if (user && user.user_metadata?.tenant_id) {
        tenantId = user.user_metadata.tenant_id
      }
    }
    if (!tenantId) {
      throw createError({ statusCode: 400, message: 'Não foi possível identificar o tenant_id' })
    }
    const companyToInsert = {
      name: body.name,
      website: body.website,
      industry: body.industry,
      size: body.size,
      address: body.address,
      city: body.city,
      country: body.country,
      phone: body.phone,
      email: body.email,
      notes: body.notes,
      tenant_id: tenantId,
    }
    if (!companyToInsert.name) {
      throw createError({ statusCode: 400, message: 'Nome é obrigatório' })
    }
    const { data, error } = await client.from('crm_company').insert([companyToInsert]).select().single()
    if (error) {
      throw createError({ statusCode: 500, message: error.message || 'Falha ao criar company' })
    }
    return { statusCode: 201, body: data }
  } catch (error) {
    throw createError({ statusCode: error.statusCode || 500, message: error.message || 'Erro interno do servidor' })
  }
}) 