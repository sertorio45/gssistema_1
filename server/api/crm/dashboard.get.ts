import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { createError, defineEventHandler, getQuery } from 'h3'

import type { DashboardKPI, DashboardRecentActivity, DashboardStageStat } from '~/types/crm'
import {
  canAccessTenantModule,
  isWrongTenantForScopedUser,
  resolveTenantApiAuth,
} from '~/server/utils/tenant-access'

interface LeadRow {
  id: string
  name: string
  company: string | null
  value: number | null
  status: string
  source: string | null
  source_id: string | null
  sales_stage_id: string | null
  assigned_to: string | null
  funnel_id: string | null
  created_at: string
  updated_at: string
  closed_at: string | null
}

interface StageRow {
  id: string
  name: string
  color: string | null
  order: number | null
  funnel_id: string | null
}

const SOURCE_LABELS: Record<string, string> = {
  website: 'Site',
  referral: 'Indicação',
  social: 'Redes sociais',
  email: 'E-mail',
  phone: 'Telefone',
  other: 'Outros',
}

function isWonStageName(name: string) {
  const n = name.toLowerCase()
  return n.includes('ganh') || n.includes('won')
}

function isNegotiationStageName(name: string) {
  const n = name.toLowerCase()
  return n.includes('negocia') || n.includes('negoti')
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', { month: 'short' })
    .format(date)
    .replace('.', '')
    .replace(/^\w/, c => c.toUpperCase())
}

function buildEmptyMonths(now: Date) {
  const months: Array<{ key: string, month: string, revenue: number }> = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({ key: monthKey(d), month: monthLabel(d), revenue: 0 })
  }
  return months
}

function relativeActivityType(lead: LeadRow): DashboardRecentActivity['type'] {
  if (lead.status === 'won')
    return 'won'
  const created = new Date(lead.created_at).getTime()
  const updated = new Date(lead.updated_at).getTime()
  if (Math.abs(updated - created) < 60_000)
    return 'created'
  return 'updated'
}

function activityTitle(type: DashboardRecentActivity['type']) {
  if (type === 'won')
    return 'Negócio ganho'
  if (type === 'created')
    return 'Novo lead criado'
  return 'Lead atualizado'
}

export default defineEventHandler(async (event): Promise<DashboardKPI> => {
  const user = await serverSupabaseUser(event)
  if (!user)
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const { role, tenantId } = resolveTenantApiAuth(user, event.context.auth?.tenantId)
  const client = await serverSupabaseServiceRole(event)
  const { funnel_id, tenant_id: queryTenantId } = getQuery(event)

  const effectiveTenantId = (queryTenantId as string) || tenantId
  if (!effectiveTenantId)
    throw createError({ statusCode: 400, statusMessage: 'Tenant ID is required' })

  if (!canAccessTenantModule(role))
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  if (isWrongTenantForScopedUser(role, tenantId, effectiveTenantId))
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  let leadsQuery = client
    .from('crm_lead')
    .select('id, name, company, value, status, source, source_id, sales_stage_id, assigned_to, funnel_id, created_at, updated_at, closed_at')
    .eq('tenant_id', effectiveTenantId)

  if (funnel_id)
    leadsQuery = leadsQuery.eq('funnel_id', funnel_id as string)

  const [leadsResult, stagesResult, sourcesResult] = await Promise.all([
    leadsQuery,
    client
      .from('crm_sales_stage')
      .select('id, name, color, order, funnel_id')
      .or(`is_default.eq.true,tenant_id.eq.${effectiveTenantId}`)
      .order('order', { ascending: true }),
    client
      .from('crm_lead_source_table')
      .select('id, name')
      .or(`is_default.eq.true,tenant_id.eq.${effectiveTenantId}`),
  ])

  if (leadsResult.error)
    throw createError({ statusCode: 400, statusMessage: leadsResult.error.message })
  if (stagesResult.error)
    throw createError({ statusCode: 400, statusMessage: stagesResult.error.message })
  // Sources are optional for aggregation; fall back to enum labels if the query fails.

  const leads = (leadsResult.data || []) as LeadRow[]
  let stages = (stagesResult.data || []) as StageRow[]
  if (funnel_id) {
    stages = stages.filter(stage => !stage.funnel_id || stage.funnel_id === funnel_id)
  }
  else {
    const funnelIdsFromLeads = new Set(
      leads.map(lead => lead.funnel_id).filter((id): id is string => Boolean(id)),
    )
    const stageIdsFromLeads = new Set(
      leads.map(lead => lead.sales_stage_id).filter((id): id is string => Boolean(id)),
    )
    if (funnelIdsFromLeads.size > 0 || stageIdsFromLeads.size > 0) {
      stages = stages.filter(stage =>
        stageIdsFromLeads.has(stage.id)
        || (stage.funnel_id != null && funnelIdsFromLeads.has(stage.funnel_id)),
      )
    }
  }

  const sourceNameById = new Map<string, string>()
  for (const source of sourcesResult.data || []) {
    if (source?.id && source?.name)
      sourceNameById.set(String(source.id), String(source.name))
  }

  const now = new Date()
  const thisYear = now.getFullYear()
  const thisMonth = now.getMonth()

  const stageById = new Map(stages.map(stage => [stage.id, stage]))
  const wonStageIds = new Set(
    stages.filter(stage => isWonStageName(stage.name)).map(stage => stage.id),
  )
  const negotiationStageIds = new Set(
    stages.filter(stage => isNegotiationStageName(stage.name)).map(stage => stage.id),
  )

  function isWon(lead: LeadRow) {
    if (wonStageIds.size > 0 && lead.sales_stage_id)
      return wonStageIds.has(lead.sales_stage_id)
    return lead.status === 'won'
  }

  function isNegotiation(lead: LeadRow) {
    if (negotiationStageIds.size > 0 && lead.sales_stage_id)
      return negotiationStageIds.has(lead.sales_stage_id)
    return lead.status === 'negotiation'
  }

  const totalLeads = leads.length
  const newLeadsThisMonth = leads.filter((lead) => {
    const created = new Date(lead.created_at)
    return created.getFullYear() === thisYear && created.getMonth() === thisMonth
  }).length

  const wonLeads = leads.filter(isWon)
  const conversionRate = totalLeads === 0
    ? 0
    : Math.round((wonLeads.length / totalLeads) * 10000) / 100

  const totalRevenue = wonLeads.reduce((sum, lead) => sum + (Number(lead.value) || 0), 0)
  const revenueThisMonth = wonLeads
    .filter((lead) => {
      if (!lead.closed_at)
        return false
      const closed = new Date(lead.closed_at)
      return closed.getFullYear() === thisYear && closed.getMonth() === thisMonth
    })
    .reduce((sum, lead) => sum + (Number(lead.value) || 0), 0)

  const averageDealSize = wonLeads.length === 0
    ? 0
    : Math.round(totalRevenue / wonLeads.length)

  const negotiationValue = leads
    .filter(isNegotiation)
    .reduce((sum, lead) => sum + (Number(lead.value) || 0), 0)

  const stageStatsMap = new Map<string, DashboardStageStat>()
  for (const stage of stages) {
    stageStatsMap.set(stage.id, {
      id: stage.id,
      name: stage.name,
      color: stage.color || 'hsl(var(--muted))',
      count: 0,
      value: 0,
    })
  }

  for (const lead of leads) {
    const stageId = lead.sales_stage_id
    if (!stageId)
      continue
    const existing = stageStatsMap.get(stageId)
    if (existing) {
      existing.count += 1
      existing.value += Number(lead.value) || 0
      continue
    }
    const stage = stageById.get(stageId)
    stageStatsMap.set(stageId, {
      id: stageId,
      name: stage?.name || 'Sem estágio',
      color: stage?.color || 'hsl(var(--muted))',
      count: 1,
      value: Number(lead.value) || 0,
    })
  }

  const leadsPerStage = Array.from(stageStatsMap.values())
    .sort((a, b) => {
      const orderA = stages.find(s => s.id === a.id)?.order ?? 999
      const orderB = stages.find(s => s.id === b.id)?.order ?? 999
      return orderA - orderB
    })

  const months = buildEmptyMonths(now)
  const monthIndex = new Map(months.map((m, i) => [m.key, i]))
  for (const lead of wonLeads) {
    if (!lead.closed_at)
      continue
    const closed = new Date(lead.closed_at)
    const key = monthKey(closed)
    const idx = monthIndex.get(key)
    if (idx == null)
      continue
    months[idx].revenue += Number(lead.value) || 0
  }
  const revenueByMonth = months.map(({ month, revenue }) => ({ month, revenue }))

  const sourceCounts = new Map<string, number>()
  for (const lead of leads) {
    const label = (lead.source_id && sourceNameById.get(lead.source_id))
      || (lead.source && SOURCE_LABELS[lead.source])
      || lead.source
      || 'Outros'
    sourceCounts.set(label, (sourceCounts.get(label) || 0) + 1)
  }
  const topSources = Array.from(sourceCounts.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const performerMap = new Map<string, { userId: string, deals: number, revenue: number }>()
  for (const lead of wonLeads) {
    if (!lead.assigned_to)
      continue
    const current = performerMap.get(lead.assigned_to) || {
      userId: lead.assigned_to,
      deals: 0,
      revenue: 0,
    }
    current.deals += 1
    current.revenue += Number(lead.value) || 0
    performerMap.set(lead.assigned_to, current)
  }
  const topPerformers = Array.from(performerMap.values())
    .sort((a, b) => b.revenue - a.revenue || b.deals - a.deals)
    .slice(0, 5)

  const recentActivity: DashboardRecentActivity[] = [...leads]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 8)
    .map((lead) => {
      const type = relativeActivityType(lead)
      const valueLabel = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 0,
      }).format(Number(lead.value) || 0)
      const companyPart = lead.company ? ` · ${lead.company}` : ''
      return {
        id: lead.id,
        type,
        title: activityTitle(type),
        description: type === 'won'
          ? `${lead.name}${companyPart} — ${valueLabel}`
          : `${lead.name}${companyPart}`,
        occurredAt: lead.updated_at,
      }
    })

  return {
    totalLeads,
    newLeadsThisMonth,
    conversionRate,
    totalRevenue,
    revenueThisMonth,
    averageDealSize,
    negotiationValue,
    leadsPerStage,
    revenueByMonth,
    topSources,
    topPerformers,
    recentActivity,
  }
})
