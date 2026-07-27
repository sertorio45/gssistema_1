import { getRouterParam, readBody } from 'h3'
import { z } from 'zod'

import { recordSocialAudit } from '~/server/utils/social-audit'
import { requireSocialContext } from '~/server/utils/social-context'

const bodySchema = z.object({
  name: z.string().trim().min(1).max(180).optional(),
  status: z.enum(['draft', 'active', 'paused', 'ended']).optional(),
  startsAt: z.string().min(8).optional(),
  endsAt: z.string().nullable().optional(),
  postsQuota: z.number().int().min(0).optional(),
  reelsQuota: z.number().int().min(0).optional(),
  storiesQuota: z.number().int().min(0).optional(),
  campaignsQuota: z.number().int().min(0).optional(),
  captureQuota: z.number().int().min(0).optional(),
  notes: z.string().max(5000).optional(),
})

export default defineEventHandler(async (event) => {
  const packageId = String(getRouterParam(event, 'id'))
  const body = bodySchema.parse(await readBody(event))
  const { client, tenantId, user } = await requireSocialContext(event, 'marketing.social.packages.manage')

  const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.name !== undefined)
    updatePayload.name = body.name
  if (body.status !== undefined)
    updatePayload.status = body.status
  if (body.startsAt !== undefined)
    updatePayload.starts_at = body.startsAt
  if (body.endsAt !== undefined)
    updatePayload.ends_at = body.endsAt
  if (body.postsQuota !== undefined)
    updatePayload.posts_quota = body.postsQuota
  if (body.reelsQuota !== undefined)
    updatePayload.reels_quota = body.reelsQuota
  if (body.storiesQuota !== undefined)
    updatePayload.stories_quota = body.storiesQuota
  if (body.campaignsQuota !== undefined)
    updatePayload.campaigns_quota = body.campaignsQuota
  if (body.captureQuota !== undefined)
    updatePayload.capture_quota = body.captureQuota
  if (body.notes !== undefined)
    updatePayload.notes = body.notes

  const { data, error } = await client
    .from('social_client_packages')
    .update(updatePayload)
    .eq('id', packageId)
    .eq('tenant_id', tenantId)
    .select('*')
    .maybeSingle()

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })
  if (!data)
    throw createError({ statusCode: 404, statusMessage: 'Pacote não encontrado' })

  await recordSocialAudit(event, client, {
    tenantId,
    actorId: user.id,
    action: 'package.updated',
    entityType: 'social_client_package',
    entityId: packageId,
  })

  return { data }
})
