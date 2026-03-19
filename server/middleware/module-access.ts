import { createError, getHeader, getRequestURL } from 'h3'

import { createClient } from '@supabase/supabase-js'

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

  if (!moduleName)
    return

  const authHeader = getHeader(event, 'Authorization')
  if (!authHeader?.startsWith('Bearer '))
    return

  const token = authHeader.substring(7)
  if (!token)
    return

  const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_KEY || '')

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

  const role = tenantId && tenantRoles[tenantId]
    ? tenantRoles[tenantId]
    : (user.user_metadata as any)?.role || (user.app_metadata as any)?.role || null

  // Admin/funcionário: acesso total (a lógica de compra por módulo é para `cliente`)
  if (role !== 'cliente')
    return

  if (!tenantId) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const { data: isActive, error } = await supabase.rpc('is_tenant_module_active', {
    p_tenant_id: tenantId,
    p_module_name: moduleName,
  })

  if (error || !isActive) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
})

