import { readBody } from 'h3'
import { z } from 'zod'

import { recordSocialAudit } from '~/server/utils/social-audit'
import { DEFAULT_SLA_DAYS, SOCIAL_SLA_STAGE_KEYS } from '~/server/utils/social-packages'
import { requireSocialContext } from '~/server/utils/social-context'

const bodySchema = z.object({
  name: z.string().trim().min(1).max(180),
  status: z.enum(['draft', 'active', 'paused', 'ended']).default('active'),
  startsAt: z.string().min(8),
  endsAt: z.string().nullable().optional(),
  postsQuota: z.number().int().min(0).default(0),
  reelsQuota: z.number().int().min(0).default(0),
  storiesQuota: z.number().int().min(0).default(0),
  campaignsQuota: z.number().int().min(0).default(0),
  captureQuota: z.number().int().min(0).default(0),
  notes: z.string().max(5000).default(''),
  seedDefaultSla: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  const body = bodySchema.parse(await readBody(event))
  const { client, tenantId, user, workspace } = await requireSocialContext(
    event,
    'marketing.social.packages.manage',
  )

  const { data, error } = await client
    .from('social_client_packages')
    .insert({
      tenant_id: tenantId,
      organization_id: workspace.organization?.id || null,
      name: body.name,
      status: body.status,
      starts_at: body.startsAt,
      ends_at: body.endsAt || null,
      posts_quota: body.postsQuota,
      reels_quota: body.reelsQuota,
      stories_quota: body.storiesQuota,
      campaigns_quota: body.campaignsQuota,
      capture_quota: body.captureQuota,
      notes: body.notes,
      created_by: user.id,
    })
    .select('*')
    .single()

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  if (body.seedDefaultSla !== false) {
    await client.from('social_package_sla_stages').insert(
      SOCIAL_SLA_STAGE_KEYS.map(stage => ({
        tenant_id: tenantId,
        package_id: data.id,
        stage_key: stage,
        max_business_days: DEFAULT_SLA_DAYS[stage],
      })),
    )
  }

  await recordSocialAudit(event, client, {
    tenantId,
    actorId: user.id,
    action: 'package.created',
    entityType: 'social_client_package',
    entityId: data.id,
    after: { name: data.name },
  })

  return { data }
})
