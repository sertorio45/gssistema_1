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
  onboardingId: z.string().uuid(),
})

const schema = z.object({
  currentStep: z.enum(AGENCY_ONBOARDING_STEPS as unknown as [string, ...string[]]).optional(),
  payload: z.record(z.unknown()).optional(),
  status: z.enum(['draft', 'in_progress', 'cancelled']).optional(),
})

export default defineEventHandler(async (event) => {
  const params = paramsSchema.parse({
    id: getRouterParam(event, 'id'),
    onboardingId: getRouterParam(event, 'onboardingId'),
  })
  const input = schema.parse(await readBody(event))

  const context = await requireWorkspaceContext(event, {
    organizationId: params.id,
    capability: 'agency.clients.manage',
  })

  assertAgencyOrganization(context)

  const { data: existing } = await context.client
    .from('agency_client_onboardings')
    .select('*')
    .eq('id', params.onboardingId)
    .eq('organization_id', params.id)
    .maybeSingle()

  if (!existing)
    throw createError({ statusCode: 404, statusMessage: 'Onboarding não encontrado' })

  if (existing.status === 'completed') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Onboarding já concluído',
    })
  }

  const patch: Record<string, unknown> = {}
  if (input.currentStep)
    patch.current_step = input.currentStep
  if (input.payload)
    patch.payload = { ...(existing.payload || {}), ...input.payload }
  if (input.status)
    patch.status = input.status
  else if (existing.status === 'draft')
    patch.status = 'in_progress'

  const { data, error } = await context.client
    .from('agency_client_onboardings')
    .update(patch)
    .eq('id', params.onboardingId)
    .select('*')
    .single()

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  await recordAuditEvent(event, context.client, {
    organizationId: params.id,
    actorId: context.userId,
    action: 'agency.onboarding.save',
    entityType: 'agency_client_onboarding',
    entityId: params.onboardingId,
    before: { status: existing.status, current_step: existing.current_step },
    after: { status: data.status, current_step: data.current_step },
  })

  return { data }
})
