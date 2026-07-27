import { readBody } from 'h3'
import { z } from 'zod'

import { recordSocialAudit } from '~/server/utils/social-audit'
import { requireSocialContext } from '~/server/utils/social-context'

const bodySchema = z.object({
  name: z.string().trim().min(1).max(180),
  objective: z.string().max(5000).default(''),
  status: z.enum(['draft', 'active', 'paused', 'completed', 'cancelled']).default('draft'),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  ownerId: z.string().uuid().nullable().optional(),
  briefingSummary: z.string().max(10000).default(''),
})

export default defineEventHandler(async (event) => {
  const body = bodySchema.parse(await readBody(event))
  const { client, tenantId, user, workspace } = await requireSocialContext(
    event,
    'marketing.social.campaigns.manage',
  )

  const { data, error } = await client
    .from('social_campaigns')
    .insert({
      tenant_id: tenantId,
      organization_id: workspace.organization?.id || null,
      name: body.name,
      objective: body.objective,
      status: body.status,
      starts_at: body.startsAt || null,
      ends_at: body.endsAt || null,
      owner_id: body.ownerId || null,
      briefing_summary: body.briefingSummary,
      created_by: user.id,
    })
    .select('*')
    .single()

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  await recordSocialAudit(event, client, {
    tenantId,
    actorId: user.id,
    action: 'campaign.created',
    entityType: 'social_campaign',
    entityId: data.id,
    after: { name: data.name },
  })

  return { data }
})
