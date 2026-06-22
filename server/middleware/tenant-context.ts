import { createClient } from '@supabase/supabase-js'
import { defineEventHandler, getHeader } from 'h3'

import { isStaffUser, resolveStaffRole } from '~/server/utils/tenant-role'

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

  const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_KEY || '')

  const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  const service = createClient(process.env.SUPABASE_URL || '', serviceKey)

  const isUuid = (v: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)

  try {
    // Decodificar JWT para obter as claims
    const {
      data: { user },
    } = await supabase.auth.getUser(token)

    if (!user) {
      return
    }

    // Verificar se temos informações de role e tenant_id nas app_metadata
    const appMetadata = user.app_metadata || {}
    const tenantRoles = appMetadata.tenant_roles || {}
    // Buscar tenantId do contexto (ex: header, store, etc) ou pegar o primeiro
    let tenantId: string | null = null
    // Tenta pegar do header X-Tenant-Id
    tenantId = getHeader(event, 'X-Tenant-Id') || null
    if (!tenantId) {
      // Fallback: pega o primeiro tenant do objeto
      const firstTenant = Object.keys(tenantRoles)[0]
      if (firstTenant) {
        tenantId = firstTenant
      }
    }
    let role: string | null = null
    if (isStaffUser(user)) {
      role = resolveStaffRole(user)
    }
    else if (tenantId && tenantRoles[tenantId]) {
      role = tenantRoles[tenantId]
    }
    if (!role && tenantId && isUuid(tenantId)) {
      const { data: row } = await service.from('tenant').select('slug').eq('id', tenantId).maybeSingle()
      if (row?.slug && tenantRoles[row.slug])
        role = tenantRoles[row.slug]
    }
    if (!role) {
      role = (user.user_metadata as any)?.role || (user.app_metadata as any)?.role || null
    }
    // Adicionar essas informações ao evento para que estejam disponíveis nos handlers
    event.context.auth = {
      userId: user.id,
      role,
      tenantId,
    }
    // Se usuário tem role 'cliente', verificamos se possuem tenantId
    if ((role === 'cliente' || role === 'atendente') && !tenantId) {
      console.warn(`Usuário ${role} sem tenantId definido: ${user.id}`)
    }
  }
  catch (error) {
    console.error('Erro ao processar contexto de tenant:', error)
  }
})
