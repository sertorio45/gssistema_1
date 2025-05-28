import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { useTenantStore } from '~/stores/tenant'
import { defineEventHandler } from 'h3'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) return { status: 401, message: 'Unauthorized' }

  const client = await serverSupabaseServiceRole(event)
  const articleId = event.context?.params?.id
  if (!articleId) return { status: 400, message: 'Article ID not provided' }

  const { data, error } = await client.from('articles_tag_relations').select('*').eq('id', articleId)
  
  if (error) return { status: 400, message: error.message }
  return data
})
