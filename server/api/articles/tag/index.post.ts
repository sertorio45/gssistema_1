import { serverSupabaseServiceRole } from '#supabase/server'
import { createError, defineEventHandler, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  try {
    // Usar service role para cliente Supabase
    const client = await serverSupabaseServiceRole(event)
    
    // Ler o corpo da requisição
    const body = await readBody(event)
    
    // Tentar recuperar o tenant_id de diferentes formas
    let tenantId: string | null = null
    
    // 1. Verificar no corpo da requisição
    if (body.tenant_id) {
      tenantId = body.tenant_id
    }
    
    // 2. Verificar no contexto de autenticação
    if (!tenantId && event.context.auth?.tenantId) {
      tenantId = event.context.auth.tenantId
    }
    
    // 3. Se ainda não tiver, tentar recuperar do usuário autenticado
    if (!tenantId) {
      const { data: { user } } = await client.auth.getUser()
      
      if (user && user.user_metadata?.tenant_id) {
        tenantId = user.user_metadata.tenant_id
      }
    }
    
    // Se não conseguir recuperar o tenant_id, lançar erro
    if (!tenantId) {
      throw createError({
        statusCode: 400,
        message: 'Could not identify tenant_id',
      })
    }
    
    // Preparar dados para inserção
    const tagToInsert = {
      title: body.title,
      slug: body.slug,
      description: body.description,
      publish_status: body.publish_status || 'draft',
      tenant_id: tenantId,
    }
    
    // Validações básicas
    if (!tagToInsert.title || !tagToInsert.slug) {
      throw createError({
        statusCode: 400,
        message: 'Title and slug are required',
      })
    }
    
    // Verificar se já existe uma tag com o mesmo slug para este tenant
    const { data: existingTag, error: existError } = await client
      .from('articles_tag')
      .select('id')
      .eq('slug', tagToInsert.slug)
      .eq('tenant_id', tenantId)
      .single()
    
    if (existError && existError.code !== 'PGRST116') {
      throw createError({
        statusCode: 500,
        message: 'Error checking existing tag',
      })
    }
    
    if (existingTag) {
      throw createError({
        statusCode: 409,
        message: 'A tag with this slug already exists',
      })
    }
    
    // Inserir a tag
    const { data, error } = await client
      .from('articles_tag')
      .insert([tagToInsert])
      .select()
      .single()
    
    if (error) {
      throw createError({
        statusCode: 500,
        message: error.message || 'Failed to create tag',
      })
    }
    
    return {
      statusCode: 201,
      body: data,
    }
  } catch (error: any) {
    // Log detalhado do erro
    console.error('Error creating tag:', error)
    
    // Propagar o erro com detalhes
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error',
    })
  }
})
