import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { createError } from 'h3'

export async function requireOrganizationContext(
  event: any,
  organizationId?: string,
  options: { manage?: boolean, platformOnly?: boolean } = {},
) {
  const user = await serverSupabaseUser(event)
  if (!user)
    throw createError({ statusCode: 401, statusMessage: 'Não autenticado' })

  const client: any = await serverSupabaseServiceRole(event)
  const globalRole = (user.app_metadata as { role?: string })?.role
  const isPlatformStaff = globalRole === 'admin' || globalRole === 'funcionario'
  if (options.platformOnly && !isPlatformStaff)
    throw createError({ statusCode: 403, statusMessage: 'Acesso exclusivo da plataforma' })

  let membership: any = null
  if (organizationId && !isPlatformStaff) {
    const { data } = await client
      .from('organization_memberships')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()
    membership = data
    if (!membership)
      throw createError({ statusCode: 403, statusMessage: 'Sem acesso a esta organização' })
    if (options.manage && !['admin', 'cliente'].includes(membership.role))
      throw createError({ statusCode: 403, statusMessage: 'Sem permissão para gerenciar a organização' })
  }

  return { user, client, isPlatformStaff, membership }
}
