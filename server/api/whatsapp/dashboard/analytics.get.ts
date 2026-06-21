import { getQuery } from 'h3'

import { serverSupabaseServiceRole } from '#supabase/server'

import {
  buildConversationsByStatus,
  buildMessagesByDaySeries,
  buildOverviewFromCounts,
  calculateAverageResponseTimeSec,
  getDashboardPeriodStart,
  mapRecentActivity,
} from '~/server/utils/whatsapp/metrics-aggregator'
import { resolveWhatsAppTenantContext } from '~/server/utils/whatsapp/context'
import type { WhatsAppDashboardAnalytics } from '~/types/whatsapp'

export default defineEventHandler(async (event): Promise<WhatsAppDashboardAnalytics> => {
  const query = getQuery(event)
  const { tenantId } = await resolveWhatsAppTenantContext(event, query.tenant_id as string | undefined)

  const periodDays = Math.min(Math.max(Number(query.days) || 14, 7), 90)
  const periodStart = getDashboardPeriodStart(periodDays)
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const client = serverSupabaseServiceRole(event)

  const [
    conversationsRes,
    openRes,
    unreadRes,
    messagesTodayRes,
    campaignsRes,
    agentsRes,
    instancesRes,
    contactsRes,
    periodMessagesRes,
    conversationsStatusRes,
    recentConversationsRes,
    responseMessagesRes,
  ] = await Promise.all([
    client.from('whatsapp_conversation').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    client.from('whatsapp_conversation').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'open'),
    client.from('whatsapp_conversation').select('unread_count').eq('tenant_id', tenantId),
    client.from('whatsapp_message').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).gte('created_at', todayStart.toISOString()),
    client.from('whatsapp_campaign').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).in('status', ['running', 'scheduled']),
    client.from('whatsapp_agent').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('is_active', true),
    client.from('whatsapp_instance').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'connected'),
    client.from('whatsapp_contact').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    client
      .from('whatsapp_message')
      .select('from_me, sent_at, created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', periodStart.toISOString()),
    client.from('whatsapp_conversation').select('status').eq('tenant_id', tenantId),
    client
      .from('whatsapp_conversation')
      .select('id, contact_name, contact_phone, last_message_preview, last_message_at, unread_count, status')
      .eq('tenant_id', tenantId)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .limit(8),
    client
      .from('whatsapp_message')
      .select('conversation_id, from_me, sent_at, created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', periodStart.toISOString())
      .not('conversation_id', 'is', null)
      .order('sent_at', { ascending: true }),
  ])

  const unreadTotal = (unreadRes.data ?? []).reduce((sum, row) => sum + (row.unread_count ?? 0), 0)
  const periodMessages = periodMessagesRes.data ?? []
  const messagesSentPeriod = periodMessages.filter(m => m.from_me).length
  const messagesReceivedPeriod = periodMessages.filter(m => !m.from_me).length
  const avgResponseTimeSec = calculateAverageResponseTimeSec(responseMessagesRes.data ?? [])

  const overview = buildOverviewFromCounts({
    totalConversations: conversationsRes.count ?? 0,
    openConversations: openRes.count ?? 0,
    unreadMessages: unreadTotal,
    messagesToday: messagesTodayRes.count ?? 0,
    activeCampaigns: campaignsRes.count ?? 0,
    activeAgents: agentsRes.count ?? 0,
    connectedInstances: instancesRes.count ?? 0,
    totalContacts: contactsRes.count ?? 0,
    messagesSentPeriod,
    messagesReceivedPeriod,
    avgResponseTimeSec,
  })

  return {
    overview,
    messagesByDay: buildMessagesByDaySeries(periodDays, periodMessages),
    conversationsByStatus: buildConversationsByStatus(conversationsStatusRes.data ?? []),
    recentActivity: mapRecentActivity(recentConversationsRes.data ?? []),
    periodDays,
  }
})
