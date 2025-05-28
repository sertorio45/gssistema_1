import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { defineEventHandler } from 'h3'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) return { status: 401, message: 'Unauthorized' }
  

  const client = await serverSupabaseServiceRole(event)
  const { data, error } = await client.from('articles_tag').select('*')
  
  if (error) return { status: 400, message: error.message }
  return data
})
