import { getRouterParam, readBody } from 'h3'
import { z } from 'zod'

import { recordSocialAudit } from '~/server/utils/social-audit'
import { requireSocialContext } from '~/server/utils/social-context'

const bodySchema = z.object({
  name: z.string().trim().min(1).max(180).optional(),
  objective: z.string().max(5000).optional(),
  status: z.enum(['draft', 'active', 'paused', 'completed', 'cancelled']).optional(),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  ownerId: z.string().uuid().nullable().optional(),
  briefingSummary: z.string().max(10000).optional(),
  postIds: z.array(z.string().uuid()).max(100).optional(),
})

export default defineEventHandler(async (event) => {
  const campaignId = String(getRouterParam(event, 'id'))
  const body = bodySchema.parse(await readBody(event))
  const { client, tenantId, user } = await requireSocialContext(event, 'marketing.social.campaigns.manage')

  const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.name !== undefined)
    updatePayload.name = body.name
  if (body.objective !== undefined)
    updatePayload.objective = body.objective
  if (body.status !== undefined)
    updatePayload.status = body.status
  if (body.startsAt !== undefined)
    updatePayload.starts_at = body.startsAt
  if (body.endsAt !== undefined)
    updatePayload.ends_at = body.endsAt
  if (body.ownerId !== undefined)
    updatePayload.owner_id = body.ownerId
  if (body.briefingSummary !== undefined)
    updatePayload.briefing_summary = body.briefingSummary

  const { data, error } = await client
    .from('social_campaigns')
    .update(updatePayload)
    .eq('id', campaignId)
    .eq('tenant_id', tenantId)
    .select('*')
    .maybeSingle()

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })
  if (!data)
    throw createError({ statusCode: 404, statusMessage: 'Campanha não encontrada' })

  if (body.postIds) {
    await client
      .from('social_posts')
      .update({ campaign_id: null })
      .eq('tenant_id', tenantId)
      .eq('campaign_id', campaignId)

    if (body.postIds.length) {
      await client
        .from('social_posts')
        .update({ campaign_id: campaignId })
        .eq('tenant_id', tenantId)
        .in('id', body.postIds)
    }
  }

  await recordSocialAudit(event, client, {
    tenantId,
    actorId: user.id,
    action: 'campaign.updated',
    entityType: 'social_campaign',
    entityId: campaignId,
  })

  return { data }
})
