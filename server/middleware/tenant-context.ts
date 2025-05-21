import { defineEventHandler, getHeader } from 'h3'
import { createClient } from '@supabase/supabase-js'

// Este middleware adiciona o contexto de tenant às requisições da API
export default defineEventHandler(async (event) => {
  // Obter token do Authorization header
  const authHeader = getHeader(event, 'Authorization')
  
  if (!authHeader?.startsWith('Bearer ')) {
    return
  }
  
  const token = authHeader.substring(7)
  if (!token) {
    return
  }
  
  // Inicializar cliente Supabase com credenciais de aplicação
  const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_KEY || ''
  )
  
  try {
    // Decodificar JWT para obter as claims
    const { data: { user } } = await supabase.auth.getUser(token)
    
    if (!user) {
      return
    }
    
    // Verificar se temos informações de role e tenant_id nas app_metadata
    const appMetadata = user.app_metadata || {}
    const tenantRoles = appMetadata.tenant_roles || {}
    // Buscar tenantId do contexto (ex: header, store, etc) ou pegar o primeiro
    let tenantId = null
    // Tenta pegar do header X-Tenant-Id
    tenantId = getHeader(event, 'X-Tenant-Id') || null
    if (!tenantId) {
      // Fallback: pega o primeiro tenant do objeto
      const firstTenant = Object.keys(tenantRoles)[0]
      if (firstTenant) {
        tenantId = firstTenant
      }
    }
    let role = null
    if (tenantId && tenantRoles[tenantId]) {
      role = tenantRoles[tenantId]
    }
    // Adicionar essas informações ao evento para que estejam disponíveis nos handlers
    event.context.auth = {
      userId: user.id,
      role,
      tenantId
    }
    // Se usuário tem role 'cliente', verificamos se possuem tenantId
    if (role === 'cliente' && !tenantId) {
      console.warn(`Cliente sem tenantId definido: ${user.id}`)
    }
  }
  catch (error) {
    console.error('Erro ao processar contexto de tenant:', error)
  }
}) 