import type {
  WhatsAppAgentUsageStat,
  WhatsAppCampaignReportStat,
  WhatsAppFlowReportStat,
  WhatsAppReportsAnalytics,
} from '~/types/whatsapp'

import {
  buildConversationsByStatus,
  buildMessagesByDaySeries,
  buildOverviewFromCounts,
  calculateAverageResponseTimeSec,
  getDashboardPeriodStart,
  mapRecentActivity,
} from '~/server/utils/whatsapp/metrics-aggregator'

export async function buildWhatsAppReportsAnalytics(
  client: import('@supabase/supabase-js').SupabaseClient,
  tenantId: string,
  periodDays: number,
): Promise<WhatsAppReportsAnalytics> {
  const periodStart = getDashboardPeriodStart(periodDays)
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const periodStartIso = periodStart.toISOString()

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
    campaignRowsRes,
    flowExecutionsRes,
    agentSessionsRes,
    topAgentsRes,
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
      .gte('created_at', periodStartIso),
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
      .gte('created_at', periodStartIso)
      .not('conversation_id', 'is', null)
      .order('sent_at', { ascending: true }),
    client
      .from('whatsapp_campaign')
      .select('id, name, status, stats')
      .eq('tenant_id', tenantId)
      .gte('created_at', periodStartIso),
    client
      .from('whatsapp_flow_execution')
      .select('status')
      .eq('tenant_id', tenantId)
      .gte('started_at', periodStartIso),
    client
      .from('whatsapp_agent_session')
      .select('agent_id, tokens_used, whatsapp_agent(name)')
      .eq('tenant_id', tenantId)
      .gte('started_at', periodStartIso),
    client
      .from('whatsapp_agent_session')
      .select('agent_id, tokens_used, whatsapp_agent(name)')
      .eq('tenant_id', tenantId)
      .gte('started_at', periodStartIso),
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

  const campaigns: WhatsAppCampaignReportStat[] = (campaignRowsRes.data ?? []).map((row) => {
    const stats = (row.stats || {}) as Record<string, number>
    return {
      id: row.id,
      name: row.name,
      status: row.status,
      sent: Number(stats.sent || 0),
      failed: Number(stats.failed || 0),
      pending: Number(stats.pending || 0),
      total: Number(stats.total || 0),
    }
  })

  const flowCounts = new Map<string, number>()
  for (const row of flowExecutionsRes.data ?? []) {
    const status = row.status || 'unknown'
    flowCounts.set(status, (flowCounts.get(status) || 0) + 1)
  }

  const flows: WhatsAppFlowReportStat = {
    total: flowExecutionsRes.data?.length ?? 0,
    completed: flowCounts.get('completed') || 0,
    failed: flowCounts.get('failed') || 0,
    waiting: flowCounts.get('waiting') || 0,
    running: flowCounts.get('running') || 0,
  }

  const agentMap = new Map<string, WhatsAppAgentUsageStat>()
  for (const row of topAgentsRes.data ?? []) {
    const agentId = row.agent_id as string
    const agentName = (row.whatsapp_agent as { name?: string } | null)?.name || 'Agente'
    const current = agentMap.get(agentId) || { agentId, agentName, sessions: 0, tokensUsed: 0 }
    current.sessions += 1
    current.tokensUsed += Number(row.tokens_used || 0)
    agentMap.set(agentId, current)
  }

  const agentSessions = agentSessionsRes.data ?? []
  const agentsReport = {
    totalSessions: agentSessions.length,
    totalTokens: agentSessions.reduce((sum, row) => sum + Number(row.tokens_used || 0), 0),
    topAgents: Array.from(agentMap.values()).sort((a, b) => b.sessions - a.sessions).slice(0, 5),
  }

  return {
    overview,
    messagesByDay: buildMessagesByDaySeries(periodDays, periodMessages),
    conversationsByStatus: buildConversationsByStatus(conversationsStatusRes.data ?? []),
    recentActivity: mapRecentActivity(recentConversationsRes.data ?? []),
    periodDays,
    campaigns,
    flows,
    agents: agentsReport,
  }
}

export function buildReportsCsv(analytics: WhatsAppReportsAnalytics): string {
  const lines = [
    'Relatório WhatsApp',
    `Período (dias),${analytics.periodDays}`,
    '',
    'KPI,Valor',
    `Conversas totais,${analytics.overview.totalConversations}`,
    `Conversas abertas,${analytics.overview.openConversations}`,
    `Mensagens enviadas,${analytics.overview.messagesSentPeriod}`,
    `Mensagens recebidas,${analytics.overview.messagesReceivedPeriod}`,
    `Tempo médio resposta (s),${analytics.overview.avgResponseTimeSec}`,
    '',
    'Campanha,Status,Enviadas,Falhas,Pendentes,Total',
    ...analytics.campaigns.map(c => `${c.name},${c.status},${c.sent},${c.failed},${c.pending},${c.total}`),
    '',
    'Flows,Total,Concluídos,Falhas,Aguardando,Executando',
    `Flows,${analytics.flows.total},${analytics.flows.completed},${analytics.flows.failed},${analytics.flows.waiting},${analytics.flows.running}`,
  ]

  return lines.join('\n')
}
