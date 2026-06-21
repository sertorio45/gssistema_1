import { serverSupabaseServiceRole } from '#supabase/server'
import { createError, getQuery } from 'h3'

import { mapContactRow } from '~/composables/whatsapp/useWhatsAppMapper'
import { resolveWhatsAppTenantContext } from '~/server/utils/whatsapp/context'

const CONTACT_SELECT = `
  *,
  crm_contact:crm_contact_id (
    name,
    email,
    company:crm_company (name)
  )
`

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const { tenantId } = await resolveWhatsAppTenantContext(event, query.tenant_id as string | undefined)

  const search = (query.search as string | undefined)?.trim()
  const page = Math.max(Number(query.page) || 1, 1)
  const limit = Math.min(Number(query.limit) || 20, 100)
  const from = (page - 1) * limit
  const to = from + limit - 1
  const linkedOnly = query.linked_only === 'true'
  const blockedOnly = query.blocked === 'true'

  const client = serverSupabaseServiceRole(event)

  let req = client
    .from('whatsapp_contact')
    .select(CONTACT_SELECT, { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('updated_at', { ascending: false })
    .range(from, to)

  if (search) {
    req = req.or(`name.ilike.%${search}%,phone.ilike.%${search}%`)
  }

  if (linkedOnly)
    req = req.not('crm_contact_id', 'is', null)

  if (blockedOnly)
    req = req.eq('blocked', true)

  const { data, error, count } = await req

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  return {
    data: (data || []).map(row => mapContactRow(row as any)),
    total: count || 0,
    page,
    limit,
  }
})
