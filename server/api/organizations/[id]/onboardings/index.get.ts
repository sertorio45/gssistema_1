import { getRouterParam, getQuery } from 'h3'
import { z } from 'zod'

import { assertAgencyOrganization } from '~/server/utils/agency-ops'
import { requireWorkspaceContext } from '~/server/utils/workspace-context'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

const querySchema = z.object({
  status: z.enum(['draft', 'in_progress', 'completed', 'cancelled', 'failed']).optional(),
})

export default defineEventHandler(async (event) => {
  const { id: organizationId } = paramsSchema.parse({ id: getRouterParam(event, 'id') })
  const query = querySchema.parse(getQuery(event))

  const context = await requireWorkspaceContext(event, {
    organizationId,
    capability: 'agency.clients.read',
  })

  assertAgencyOrganization(context)

  let request = context.client
    .from('agency_client_onboardings')
    .select('id, organization_id, tenant_id, status, current_step, payload, error_message, created_by, created_at, updated_at, completed_at')
    .eq('organization_id', organizationId)
    .order('updated_at', { ascending: false })

  if (query.status)
    request = request.eq('status', query.status)

  const { data, error } = await request
  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  return { data: data || [] }
})
