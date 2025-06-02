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
    const meetingToInsert = {
      title: body.title,
      description: body.description,
      start_time: body.start_time,
      end_time: body.end_time,
      location: body.location,
      type: body.type,
      status: body.status,
      attendees: body.attendees,
      lead_id: body.lead_id,
      contact_id: body.contact_id,
      company_id: body.company_id,
      created_by: body.created_by,
      created_at: body.created_at,
      updated_at: body.updated_at,
      tenant_id: tenantId,
      notes: body.notes,
      outcome: body.outcome,
    }
    if (!meetingToInsert.title || !meetingToInsert.start_time || !meetingToInsert.end_time) {
      throw createError({ statusCode: 400, message: 'Título, início e fim são obrigatórios' })
    }
    const { data, error } = await client.from('crm_meeting').insert([meetingToInsert]).select().single()
    if (error) {
      throw createError({ statusCode: 500, message: error.message || 'Falha ao criar meeting' })
    }
    return { statusCode: 201, body: data }
  } catch (error) {
    throw createError({ statusCode: error.statusCode || 500, message: error.message || 'Erro interno do servidor' })
  }
}) 