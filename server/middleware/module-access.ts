import { createError, getHeader, getRequestURL } from 'h3'

import { createClient } from '@supabase/supabase-js'

import { isStaffUser, resolveStaffRole } from '~/server/utils/tenant-role'

// Bloqueia acesso a endpoints de módulos para role `cliente` quando o tenant
// não tem o módulo ativo em `public.tenant_modules`.
export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname

  // Map de prefixo -> module_name na tabela `tenant_modules`
  let moduleName: string | null = null
  if (path.startsWith('/api/crm'))
    moduleName = 'crm'
  if (path.startsWith('/api/articles'))
    moduleName = 'article'
  if (path.startsWith('/api/marketing'))
    moduleName = 'marketing'
  if (path.startsWith('/api/whatsapp'))
    moduleName = 'whatsapp'

  if (!moduleName)
    return

  const authHeader = getHeader(event, 'Authorization')
  if (!authHeader?.startsWith('Bearer '))
    return

  const token = authHeader.substring(7)
  if (!token)
    return

  const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_KEY || '', {
    global: { headers: { Authorization: authHeader } },
  })

  const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  const service = createClient(process.env.SUPABASE_URL || '', serviceKey)

  // Pega usuário e informações do JWT
  const {
    data: { user },
  } = await supabase.auth.getUser(token)

  if (!user)
    return

  const tenantRoles = (user.app_metadata as any)?.tenant_roles || {}
  let tenantId: string | null = (getHeader(event, 'X-Tenant-Id') as string | undefined) || null
  if (!tenantId) {
    const firstTenant = Object.keys(tenantRoles)[0]
    if (firstTenant)
      tenantId = firstTenant
  }

  const isUuid = (v: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)

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

  // Administração da plataforma (Superadministrador / Funcionário): todos os módulos
  if (role !== 'cliente' && role !== 'atendente')
    return

  if (!tenantId) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  // tenant_roles may use slug as key; RPC expects UUID (service role: no RLS).
  let tenantIdForRpc = tenantId
  if (!isUuid(tenantId)) {
    const { data: row } = await service.from('tenant').select('id').eq('slug', tenantId).maybeSingle()
    if (row?.id)
      tenantIdForRpc = row.id
  }

  const { data: isActive, error } = await service.rpc('is_tenant_module_active', {
    p_tenant_id: tenantIdForRpc,
    p_module_name: moduleName,
  })

  if (error || !isActive) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
})

