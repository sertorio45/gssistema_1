import { getRouterParam, readBody } from 'h3'
import { z } from 'zod'

import {
  AGENCY_ONBOARDING_STEPS,
  assertAgencyOrganization,
} from '~/server/utils/agency-ops'
import { recordAuditEvent } from '~/server/utils/audit-events'
import { requireWorkspaceContext } from '~/server/utils/workspace-context'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

const schema = z.object({
  currentStep: z.enum(AGENCY_ONBOARDING_STEPS as unknown as [string, ...string[]]).default('client_data'),
  payload: z.record(z.unknown()).default({}),
})

export default defineEventHandler(async (event) => {
  const { id: organizationId } = paramsSchema.parse({ id: getRouterParam(event, 'id') })
  const input = schema.parse(await readBody(event))

  const context = await requireWorkspaceContext(event, {
    organizationId,
    capability: 'agency.clients.manage',
  })

  assertAgencyOrganization(context)

  const { data, error } = await context.client
    .from('agency_client_onboardings')
    .insert({
      organization_id: organizationId,
      status: 'draft',
      current_step: input.currentStep,
      payload: input.payload,
      created_by: context.userId,
    })
    .select('*')
    .single()

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  await recordAuditEvent(event, context.client, {
    organizationId,
    actorId: context.userId,
    action: 'agency.onboarding.create',
    entityType: 'agency_client_onboarding',
    entityId: data.id,
    after: { status: data.status, current_step: data.current_step },
  })

  return { data }
})
