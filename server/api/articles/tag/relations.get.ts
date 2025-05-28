import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { defineEventHandler } from 'h3'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) return { status: 401, message: 'Unauthorized' }

  const client = await serverSupabaseClient(event)
  const { data, error } = await client.from('articles_tag_relations').select('*')
  
  if (error) return { status: 400, message: error.message }
  return data
})
