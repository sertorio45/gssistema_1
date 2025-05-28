import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { defineEventHandler, getQuery } from 'h3'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) return { status: 401, message: 'Unauthorized' }

  const client = await serverSupabaseServiceRole(event)
  const query = getQuery(event)
  const { article_id, tenant_id } = query

  let supabaseQuery = client.from('articles_tag_relations').select('*')
  if (article_id) {
    supabaseQuery = supabaseQuery.eq('article_id', article_id)
  }
  if (tenant_id) {
    supabaseQuery = supabaseQuery.eq('tenant_id', tenant_id)
  }

  const { data, error } = await supabaseQuery
  if (error) return { status: 400, message: error.message }
  return data
})
