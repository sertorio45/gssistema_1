import { serverSupabaseServiceRole } from '#supabase/server'
import { createError, getQuery } from 'h3'

import { buildReportsCsv, buildWhatsAppReportsAnalytics } from '~/server/utils/whatsapp/reports-aggregator'
import { resolveWhatsAppTenantContext } from '~/server/utils/whatsapp/context'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const { tenantId } = await resolveWhatsAppTenantContext(event, query.tenant_id as string | undefined)
  const periodDays = Math.min(Math.max(Number(query.days) || 30, 7), 90)
  const format = String(query.format || 'json')

  const client = serverSupabaseServiceRole(event)
  const analytics = await buildWhatsAppReportsAnalytics(client, tenantId, periodDays)

  if (format === 'csv') {
    setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
    setHeader(event, 'Content-Disposition', `attachment; filename="whatsapp-relatorio-${periodDays}d.csv"`)
    return buildReportsCsv(analytics)
  }

  return analytics
})
