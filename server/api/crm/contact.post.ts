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
    const contactToInsert = {
      name: body.name,
      email: body.email,
      phone: body.phone,
      position: body.position,
      company_id: body.company_id,
      notes: body.notes,
      tags: body.tags,
      last_contact: body.last_contact,
      tenant_id: tenantId,
    }
    if (!contactToInsert.name || !contactToInsert.email || !contactToInsert.phone) {
      throw createError({ statusCode: 400, message: 'Nome, email e telefone são obrigatórios' })
    }
    const { data, error } = await client.from('crm_contact').insert([contactToInsert]).select().single()
    if (error) {
      throw createError({ statusCode: 500, message: error.message || 'Falha ao criar contact' })
    }
    return { statusCode: 201, body: data }
  } catch (error) {
    throw createError({ statusCode: error.statusCode || 500, message: error.message || 'Erro interno do servidor' })
  }
}) 