import { serverSupabaseServiceRole } from '#supabase/server'
import { getQuery } from 'h3'

import { resolveWhatsAppTenantContext, sanitizeInstanceRow } from '~/server/utils/whatsapp/context'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const { tenantId } = await resolveWhatsAppTenantContext(event, query.tenant_id as string | undefined)
  const client = serverSupabaseServiceRole(event)

  const { data: instances, error } = await client
    .from('whatsapp_instance')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    throw createError({ statusCode: 400, statusMessage: error.message })
  }

  const instanceIds = (instances || []).map(i => i.id)
  let integrations: Record<string, any>[] = []

  if (instanceIds.length) {
    const { data } = await client
      .from('whatsapp_integration')
      .select('*')
      .in('instance_id', instanceIds)
    integrations = data || []
  }

  const integrationMap = new Map(integrations.map(i => [i.instance_id, i]))

  const { data: conversationStats } = await client
    .from('whatsapp_conversation')
    .select('instance_id, unread_count')
    .eq('tenant_id', tenantId)
    .in('instance_id', instanceIds.length ? instanceIds : ['00000000-0000-0000-0000-000000000000'])

  const statsByInstance = new Map<string, { conversationCount: number, unreadCount: number }>()
  for (const row of conversationStats || []) {
    const id = row.instance_id as string
    if (!id)
      continue
    const current = statsByInstance.get(id) || { conversationCount: 0, unreadCount: 0 }
    current.conversationCount += 1
    current.unreadCount += Number(row.unread_count || 0)
    statsByInstance.set(id, current)
  }

  let totalUnread = 0
  let totalConversations = 0
  for (const stats of statsByInstance.values()) {
    totalUnread += stats.unreadCount
    totalConversations += stats.conversationCount
  }

  return {
    data: (instances || []).map((row) => {
      const stats = statsByInstance.get(row.id as string) || { conversationCount: 0, unreadCount: 0 }
      return {
        ...sanitizeInstanceRow(row, integrationMap.get(row.id) || null),
        conversationCount: stats.conversationCount,
        unreadCount: stats.unreadCount,
      }
    }),
    meta: {
      totalUnread,
      totalConversations,
    },
  }
})
