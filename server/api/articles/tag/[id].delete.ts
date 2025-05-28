import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { defineEventHandler, getRouterParam } from 'h3'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    return { status: 401, message: 'Unauthorized' }
  }

  const client = await serverSupabaseClient(event)
  const id = getRouterParam(event, 'id')

  const { error } = await client.from('articles_tag').delete().eq('id', id)
  if (error) {
    return { status: 400, message: error.message }
  }
  return { success: true }
})
