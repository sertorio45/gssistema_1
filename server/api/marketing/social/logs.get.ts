import { getQuery } from 'h3'

import { holdsCapability } from '~/constants/workspace'
import { requireSocialContext } from '~/server/utils/social-context'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  // Audit logs require manage — never gate on legacy app_role === 'admin'.
  const { client, tenantId, workspace, isPlatformStaff } = await requireSocialContext(
    event,
    'marketing.social.manage',
  )

  const canReadAudit = isPlatformStaff
    || holdsCapability(workspace.capabilities, 'marketing.social.manage')
    || holdsCapability(workspace.capabilities, 'platform.audit.read')
  if (!canReadAudit)
    throw createError({ statusCode: 403, statusMessage: 'Sem permissão para ver auditoria' })

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
  // Never expose integration secrets accidentally stored in after_data.
  const sanitized = rows.map((row: any) => ({
    ...row,
    after_data: scrubSecrets(row.after_data),
    before_data: scrubSecrets(row.before_data),
  }))

  const actorIds = [...new Set(sanitized.map((row: any) => row.actor_id).filter(Boolean))]
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
    data: sanitized.map((row: any) => ({
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

function scrubSecrets(payload: unknown) {
  if (!payload || typeof payload !== 'object')
    return payload
  const clone = JSON.parse(JSON.stringify(payload))
  const walk = (node: any) => {
    if (!node || typeof node !== 'object')
      return
    for (const key of Object.keys(node)) {
      if (/token|secret|password|access_token|page_access_token/i.test(key))
        node[key] = '[redacted]'
      else
        walk(node[key])
    }
  }
  walk(clone)
  return clone
}
