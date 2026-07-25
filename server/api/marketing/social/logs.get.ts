import { getQuery } from 'h3'

import { requireAuthenticatedUser } from '~/server/utils/admin-auth'
import { requireSocialContext } from '~/server/utils/social-context'

export default defineEventHandler(async (event) => {
  const user = await requireAuthenticatedUser(event)
  const globalRole = (user.app_metadata as { role?: string } | undefined)?.role
  if (globalRole !== 'admin')
    throw createError({ statusCode: 403, statusMessage: 'Apenas superadministradores podem ver os logs' })

  const { client, tenantId } = await requireSocialContext(event, 'marketing.social.read')
  const query = getQuery(event)
  const page = Math.max(1, Number(query.page || 1))
  const pageSize = Math.min(100, Math.max(1, Number(query.page_size || 50)))
  const action = String(query.action || '').trim()
  const entityType = String(query.entity_type || '').trim()
  const search = String(query.search || '').trim()

  let request = client
    .from('audit_events')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (action)
    request = request.eq('action', action)
  if (entityType)
    request = request.eq('entity_type', entityType)
  if (search) {
    const safe = search.replace(/[%_,.()]/g, '')
    if (safe)
      request = request.or(`action.ilike.%${safe}%,entity_type.ilike.%${safe}%`)
  }

  const { data, error, count } = await request
  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  const rows = data || []
  const actorIds = [...new Set(rows.map((row: any) => row.actor_id).filter(Boolean))]
  const actors = new Map<string, { name: string, email: string }>()

  await Promise.all(actorIds.map(async (actorId) => {
    const { data: authUser } = await client.auth.admin.getUserById(String(actorId))
    const profile = authUser?.user
    if (!profile)
      return
    actors.set(String(actorId), {
      name: String(profile.user_metadata?.name || profile.email || 'Usuário'),
      email: String(profile.email || ''),
    })
  }))

  return {
    data: rows.map((row: any) => ({
      ...row,
      actor: row.actor_id ? actors.get(String(row.actor_id)) || null : null,
    })),
    pagination: {
      page,
      pageSize,
      total: count || 0,
      totalPages: Math.max(1, Math.ceil((count || 0) / pageSize)),
    },
  }
})
