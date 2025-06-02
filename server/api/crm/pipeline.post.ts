import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { createError, defineEventHandler, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    return { status: 401, message: 'Unauthorized' }
  }

  const body = await readBody(event)
  const tenantId = body.tenant_id || event.context.auth?.tenantId
  if (!tenantId) {
    throw createError({ statusCode: 400, message: 'tenant_id obrigatório' })
  }
  const pipelineToInsert = {
    name: body.name,
    description: body.description,
    tenant_id: tenantId,
    is_default: body.is_default || false,
  }
  if (!pipelineToInsert.name) {
    throw createError({ statusCode: 400, message: 'Nome é obrigatório' })
  }
  const client = await serverSupabaseServiceRole(event)
  const { data, error } = await client.from('crm_pipeline').insert([pipelineToInsert]).select().single()
  if (error) {
    throw createError({ statusCode: 500, message: error.message || 'Falha ao criar pipeline' })
  }
  return { statusCode: 201, body: data }
}) 