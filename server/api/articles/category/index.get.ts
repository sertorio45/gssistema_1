import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { defineEventHandler } from 'h3'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) return { status: 401, message: 'Unauthorized' }

  // Recuperar tenant_id do usuário
  const tenantId = user.user_metadata?.tenant_id

  if (!tenantId) {
    return { 
      status: 400, 
      message: 'Tenant não identificado' 
    }
  }

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('articles_category')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('title')
  
  if (error) return { status: 400, message: error.message }
  return data
})
