import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

import { defineEventHandler, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user)
    return { status: 401, message: 'Unauthorized' }

  const body = await readBody(event) as {
    tenant_id: string
    name: string
    description?: string
    type: 'recorrente' | 'avulso'
    price: number
    recurrence?: 'mensal' | 'trimestral' | 'semestral' | 'anual' | null
    category_id?: string | null
    tags?: string[]
    active?: boolean
  }

  if (!body.tenant_id)
    return { status: 400, message: 'Tenant ID is required' }
  if (!body.name || String(body.name).trim() === '')
    return { status: 400, message: 'Name is required' }
  if (body.type !== 'recorrente' && body.type !== 'avulso')
    return { status: 400, message: 'Type must be recorrente or avulso' }
  if (typeof body.price !== 'number' || body.price < 0)
    return { status: 400, message: 'Valid price is required' }

  const client = await serverSupabaseServiceRole(event)
  const insert: Record<string, unknown> = {
    tenant_id: body.tenant_id,
    name: body.name.trim(),
    description: body.description?.trim() ?? null,
    type: body.type,
    price: Number(body.price),
    recurrence: body.type === 'recorrente' ? (body.recurrence ?? null) : null,
    category_id: body.category_id ?? null,
    tags: Array.isArray(body.tags) ? body.tags : [],
    active: body.active !== false,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await client
    .from('crm_products')
    .insert(insert)
    .select()
    .single()

  if (error)
    return { status: 400, message: error.message }
  return data
})
