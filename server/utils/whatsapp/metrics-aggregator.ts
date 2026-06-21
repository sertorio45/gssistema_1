import type {
  WhatsAppConversationsByStatus,
  WhatsAppDashboardOverview,
  WhatsAppMessagesByDay,
  WhatsAppRecentActivity,
} from '~/types/whatsapp'

const STATUS_LABELS: Record<string, string> = {
  open: 'Abertas',
  pending: 'Pendentes',
  resolved: 'Resolvidas',
  spam: 'Spam',
}

export function getDashboardPeriodStart(days: number): Date {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - (days - 1))
  return start
}

export function formatDayLabel(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(date)
}

export function buildMessagesByDaySeries(
  days: number,
  messages: Array<{ from_me: boolean, sent_at?: string | null, created_at?: string | null }>,
): WhatsAppMessagesByDay[] {
  const start = getDashboardPeriodStart(days)
  const series: WhatsAppMessagesByDay[] = []

  for (let i = 0; i < days; i++) {
    const date = new Date(start)
    date.setDate(start.getDate() + i)
    const key = date.toISOString().slice(0, 10)
    series.push({
      date: key,
      label: formatDayLabel(key),
      sent: 0,
      received: 0,
    })
  }

  const indexByDate = new Map(series.map((row, idx) => [row.date, idx]))

  for (const message of messages) {
    const timestamp = message.sent_at || message.created_at
    if (!timestamp)
      continue

    const key = timestamp.slice(0, 10)
    const idx = indexByDate.get(key)
    if (idx === undefined)
      continue

    if (message.from_me)
      series[idx].sent += 1
    else
      series[idx].received += 1
  }

  return series
}

export function buildConversationsByStatus(
  rows: Array<{ status?: string | null }>,
): WhatsAppConversationsByStatus[] {
  const counts = new Map<string, number>()

  for (const row of rows) {
    const status = row.status || 'open'
    counts.set(status, (counts.get(status) || 0) + 1)
  }

  return Array.from(counts.entries()).map(([status, count]) => ({
    status,
    label: STATUS_LABELS[status] || status,
    count,
  }))
}

export function calculateAverageResponseTimeSec(
  messages: Array<{
    conversation_id?: string | null
    from_me: boolean
    sent_at?: string | null
    created_at?: string | null
  }>,
): number {
  const byConversation = new Map<string, typeof messages>()

  for (const message of messages) {
    if (!message.conversation_id)
      continue
    const list = byConversation.get(message.conversation_id) || []
    list.push(message)
    byConversation.set(message.conversation_id, list)
  }

  const responseTimes: number[] = []

  for (const list of byConversation.values()) {
    const sorted = [...list].sort((a, b) => {
      const aTime = new Date(a.sent_at || a.created_at || 0).getTime()
      const bTime = new Date(b.sent_at || b.created_at || 0).getTime()
      return aTime - bTime
    })

    let lastOutbound: number | null = null

    for (const message of sorted) {
      const ts = new Date(message.sent_at || message.created_at || 0).getTime()
      if (message.from_me) {
        lastOutbound = ts
        continue
      }
      if (lastOutbound && ts >= lastOutbound) {
        responseTimes.push(Math.round((ts - lastOutbound) / 1000))
        lastOutbound = null
      }
    }
  }

  if (!responseTimes.length)
    return 0

  return Math.round(responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length)
}

export function mapRecentActivity(
  rows: Array<{
    id: string
    contact_name: string
    contact_phone: string
    last_message_preview?: string | null
    last_message_at?: string | null
    unread_count?: number | null
    status?: string | null
  }>,
): WhatsAppRecentActivity[] {
  return rows.map(row => ({
    id: row.id,
    contactName: row.contact_name,
    contactPhone: row.contact_phone,
    lastMessagePreview: row.last_message_preview || '',
    lastMessageAt: row.last_message_at || null,
    unreadCount: row.unread_count ?? 0,
    status: row.status || 'open',
  }))
}

export function buildOverviewFromCounts(params: {
  totalConversations: number
  openConversations: number
  unreadMessages: number
  messagesToday: number
  activeCampaigns: number
  activeAgents: number
  connectedInstances: number
  totalContacts: number
  messagesSentPeriod: number
  messagesReceivedPeriod: number
  avgResponseTimeSec: number
}): WhatsAppDashboardOverview {
  return {
    totalConversations: params.totalConversations,
    openConversations: params.openConversations,
    unreadMessages: params.unreadMessages,
    messagesToday: params.messagesToday,
    activeCampaigns: params.activeCampaigns,
    activeAgents: params.activeAgents,
    avgResponseTimeSec: params.avgResponseTimeSec,
    connectedInstances: params.connectedInstances,
    totalContacts: params.totalContacts,
    messagesSentPeriod: params.messagesSentPeriod,
    messagesReceivedPeriod: params.messagesReceivedPeriod,
  }
}
