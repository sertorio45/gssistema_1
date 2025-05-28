import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { defineEventHandler, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) return { status: 401, message: 'Unauthorized' }

  const client = await serverSupabaseServiceRole(event)
  const body = await readBody(event)
  const { article_id, tenant_id, tag_ids } = body

  if (!article_id || !tenant_id || !Array.isArray(tag_ids)) {
    return { status: 400, message: 'Missing article_id, tenant_id or tag_ids' }
  }

  // Remove todas as relações antigas desse artigo/tenant
  const { error: delError } = await client
    .from('articles_tag_relations')
    .delete()
    .eq('article_id', article_id)
    .eq('tenant_id', tenant_id)
  if (delError) return { status: 400, message: delError.message }

  // Insere as novas relações
  if (tag_ids.length > 0) {
    const inserts = tag_ids.map((tag_id: number) => ({ article_id, tenant_id, tag_id }))
    const { error: insError } = await client
      .from('articles_tag_relations')
      .insert(inserts)
    if (insError) return { status: 400, message: insError.message }
  }

  return { status: 200, message: 'Tag relations updated' }
})
