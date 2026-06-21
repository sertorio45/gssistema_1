import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

import { defineEventHandler, getQuery } from 'h3'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    return { status: 401, message: 'Unauthorized' }
  }

  const tenantRoles = user.app_metadata?.tenant_roles || {}
  let tenantId = event.context.auth?.tenantId
  if (!tenantId) {
    const firstTenant = Object.keys(tenantRoles)[0]
    if (firstTenant) {
      tenantId = firstTenant
    }
  }

  let role = null
  if (tenantId && tenantRoles[tenantId]) {
    role = tenantRoles[tenantId]
  }
  else {
    role = user.user_metadata?.role || user.app_metadata?.role
  }

  const client = await serverSupabaseServiceRole(event)
  const { pipeline_id, tenant_id: queryTenantId, start_date, end_date } = getQuery(event)

  const effectiveTenantId = (queryTenantId as string) || tenantId
  if (!effectiveTenantId) {
    return { status: 400, message: 'Tenant ID is required' }
  }

  if (role === 'cliente' && effectiveTenantId !== tenantId) {
    return { status: 403, message: 'Forbidden' }
  }

  if (role === 'admin' || role === 'funcionario' || role === 'cliente') {
    let query = client
      .from('crm_lead')
      .select('*, crm_contact(email, phone, name, position)')
      .eq('tenant_id', effectiveTenantId)
    if (pipeline_id) {
      query = query.eq('pipeline_id', pipeline_id)
    }
    if (start_date) {
      query = query.gte('created_at', `${start_date}T00:00:00.000Z`)
    }
    if (end_date) {
      query = query.lte('created_at', `${end_date}T23:59:59.999Z`)
    }

    const { data, error } = await query
    if (error) {
      return { status: 400, message: error.message }
    }

    return (data || []).map((lead: Record<string, unknown>) => {
      const contacts = lead.crm_contact as Array<{ email?: string, phone?: string, name?: string, position?: string }> | null
      const primaryContact = Array.isArray(contacts) ? contacts[0] : null
      const { crm_contact: _contacts, ...leadFields } = lead
      return {
        ...leadFields,
        email: primaryContact?.email ?? null,
        phone: primaryContact?.phone ?? null,
        contact_name: primaryContact?.name ?? null,
        contact_position: primaryContact?.position ?? null,
      }
    })
  }
  else {
    return { status: 403, message: 'Forbidden' }
  }
})
