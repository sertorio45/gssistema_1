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
    const leadToInsert = {
      name: body.name,
      email: body.email,
      phone: body.phone,
      company: body.company,
      status: body.status,
      source: body.source,
      value: body.value,
      priority: body.priority,
      assigned_to: body.assigned_to,
      notes: body.notes,
      created_at: body.created_at,
      updated_at: body.updated_at,
      last_contact: body.last_contact,
      next_follow_up: body.next_follow_up,
      tags: body.tags,
      tenant_id: tenantId,
    }
    if (!leadToInsert.name || !leadToInsert.email || !leadToInsert.phone) {
      throw createError({ statusCode: 400, message: 'Nome, email e telefone são obrigatórios' })
    }
    const { data, error } = await client.from('crm_lead').insert([leadToInsert]).select().single()
    if (error) {
      throw createError({ statusCode: 500, message: error.message || 'Falha ao criar lead' })
    }
    return { statusCode: 201, body: data }
  } catch (error) {
    throw createError({ statusCode: error.statusCode || 500, message: error.message || 'Erro interno do servidor' })
  }
}) 