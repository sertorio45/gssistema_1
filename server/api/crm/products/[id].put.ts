import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

import { defineEventHandler, getRouterParam, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user)
    return { status: 401, message: 'Unauthorized' }

  const id = getRouterParam(event, 'id')
  if (!id)
    return { status: 400, message: 'ID is required' }

  const body = await readBody(event) as {
    tenant_id: string
    name?: string
    description?: string
    type?: 'recorrente' | 'avulso'
    price?: number
    recurrence?: 'mensal' | 'trimestral' | 'semestral' | 'anual' | null
    category_id?: string | null
    tags?: string[]
    active?: boolean
  }

  if (!body.tenant_id)
    return { status: 400, message: 'Tenant ID is required' }

  const client = await serverSupabaseServiceRole(event)
  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (body.name !== undefined)
    update.name = String(body.name).trim()
  if (body.description !== undefined)
    update.description = body.description?.trim() ?? null
  if (body.type !== undefined)
    update.type = body.type
  if (typeof body.price === 'number')
    update.price = body.price
  if (body.type === 'avulso')
    update.recurrence = null
  else if (body.recurrence !== undefined)
    update.recurrence = body.recurrence
  if (body.category_id !== undefined)
    update.category_id = body.category_id ?? null
  if (Array.isArray(body.tags))
    update.tags = body.tags
  if (typeof body.active === 'boolean')
    update.active = body.active

  const { data, error } = await client
    .from('crm_products')
    .update(update)
    .eq('id', id)
    .eq('tenant_id', body.tenant_id)
    .select()
    .single()

  if (error)
    return { status: 400, message: error.message }
  if (!data)
    return { status: 404, message: 'Product not found' }
  return data
})
