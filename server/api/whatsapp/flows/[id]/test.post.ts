import { serverSupabaseServiceRole } from '#supabase/server'
import { createError, getQuery, getRouterParam } from 'h3'

import { testFlowExecution } from '~/server/utils/whatsapp/flow-dispatcher'
import { resolveWhatsAppTenantContext } from '~/server/utils/whatsapp/context'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, statusMessage: 'id is required' })

  const query = getQuery(event)
  const { tenantId } = await resolveWhatsAppTenantContext(event, query.tenant_id as string | undefined)
  const client = serverSupabaseServiceRole(event)

  try {
    const result = await testFlowExecution(client, tenantId, id)
    return { ok: true, result }
  }
  catch (error: any) {
    throw createError({
      statusCode: 400,
      statusMessage: error?.message || 'Test failed',
    })
  }
})
