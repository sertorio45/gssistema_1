import { createError, getQuery } from 'h3'

import { serverSupabaseServiceRole } from '#supabase/server'

import { resolveWhatsAppTenantContext } from '~/server/utils/whatsapp/context'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, statusMessage: 'id is required' })

  const query = getQuery(event)
  const { tenantId } = await resolveWhatsAppTenantContext(event, query.tenant_id as string | undefined)
  const client = serverSupabaseServiceRole(event)

  const { error } = await client
    .from('whatsapp_conversation')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  return { success: true }
})
