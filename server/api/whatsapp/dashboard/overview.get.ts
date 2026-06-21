import { getQuery } from 'h3'

import { serverSupabaseServiceRole } from '#supabase/server'

import { buildOverviewFromCounts, getDashboardPeriodStart } from '~/server/utils/whatsapp/metrics-aggregator'
import { resolveWhatsAppTenantContext } from '~/server/utils/whatsapp/context'
import type { WhatsAppDashboardOverview } from '~/types/whatsapp'

export default defineEventHandler(async (event): Promise<WhatsAppDashboardOverview> => {
  const query = getQuery(event)
  const { tenantId } = await resolveWhatsAppTenantContext(event, query.tenant_id as string | undefined)

  const client = serverSupabaseServiceRole(event)
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const periodStart = getDashboardPeriodStart(14)

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
      .select('from_me')
      .eq('tenant_id', tenantId)
      .gte('created_at', periodStart.toISOString()),
  ])

  const unreadTotal = (unreadRes.data ?? []).reduce((sum, row) => sum + (row.unread_count ?? 0), 0)
  const periodMessages = periodMessagesRes.data ?? []

  return buildOverviewFromCounts({
    totalConversations: conversationsRes.count ?? 0,
    openConversations: openRes.count ?? 0,
    unreadMessages: unreadTotal,
    messagesToday: messagesTodayRes.count ?? 0,
    activeCampaigns: campaignsRes.count ?? 0,
    activeAgents: agentsRes.count ?? 0,
    connectedInstances: instancesRes.count ?? 0,
    totalContacts: contactsRes.count ?? 0,
    messagesSentPeriod: periodMessages.filter(m => m.from_me).length,
    messagesReceivedPeriod: periodMessages.filter(m => !m.from_me).length,
    avgResponseTimeSec: 0,
  })
})
