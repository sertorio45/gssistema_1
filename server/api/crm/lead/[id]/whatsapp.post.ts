import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { isWrongTenantForScopedUser } from '~/server/utils/tenant-access'
import { createError, getQuery } from 'h3'

import { resolveLeadWhatsAppConversation } from '~/server/utils/whatsapp/lead-whatsapp'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const leadId = getRouterParam(event, 'id')
  if (!leadId) {
    throw createError({ statusCode: 400, statusMessage: 'Lead ID is required' })
  }

  const tenantRoles = user.app_metadata?.tenant_roles || {}
  let tenantId = event.context.auth?.tenantId as string | undefined
  if (!tenantId) {
    const firstTenant = Object.keys(tenantRoles)[0]
    if (firstTenant)
      tenantId = firstTenant
  }

  const { tenant_id: queryTenantId } = getQuery(event)
  const effectiveTenantId = (queryTenantId as string) || tenantId

  if (!effectiveTenantId) {
    throw createError({ statusCode: 400, statusMessage: 'Tenant ID is required' })
  }

  const role = tenantId && tenantRoles[tenantId]
    ? tenantRoles[tenantId]
    : user.user_metadata?.role || user.app_metadata?.role

  if (isWrongTenantForScopedUser(role, tenantId, effectiveTenantId)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const client = serverSupabaseServiceRole(event)

  try {
    const result = await resolveLeadWhatsAppConversation(client, effectiveTenantId, leadId)
    return {
      data: {
        conversationId: result.conversationId,
        hasConversation: true,
        phone: result.phone,
        linked: result.linked,
        reopened: result.reopened,
      },
    }
  }
  catch (error: any) {
    throw createError({
      statusCode: error?.statusCode || 500,
      statusMessage: error?.statusMessage || error?.message || 'Falha ao vincular conversa WhatsApp',
    })
  }
})
