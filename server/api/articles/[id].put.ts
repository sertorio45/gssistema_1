import { serverSupabaseServiceRole } from '#supabase/server'
import { defineEventHandler, getRouterParam, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  // Cliente Supabase com service role
  const client = await serverSupabaseServiceRole(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  // Atualizar artigo
  const { data, error } = await client
    .from('articles')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (error || !data) {
    return { status: 400, message: error?.message || 'Erro ao atualizar artigo' }
  }

  return { status: 200, data }
})
