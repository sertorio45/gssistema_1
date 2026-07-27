import { readBody } from 'h3'
import { z } from 'zod'

import { recordSocialAudit } from '~/server/utils/social-audit'
import { createBriefingLink } from '~/server/utils/social-briefing-links'
import { requireSocialContext } from '~/server/utils/social-context'

const bodySchema = z.object({
  title: z.string().trim().max(180).optional(),
  campaignId: z.string().uuid().nullable().optional(),
  templateId: z.string().uuid().nullable().optional(),
  expiresInHours: z.number().int().min(1).max(720).optional(),
  maxUses: z.number().int().positive().nullable().optional(),
  requireEmailConfirm: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  const body = bodySchema.parse(await readBody(event))
  const { client, tenantId, user, workspace } = await requireSocialContext(
    event,
    'marketing.social.briefing.create',
  )

  const created = await createBriefingLink(client, {
    tenantId,
    organizationId: workspace.organization?.id || null,
    userId: user.id,
    title: body.title,
    campaignId: body.campaignId,
    templateId: body.templateId,
    expiresInHours: body.expiresInHours,
    maxUses: body.maxUses,
    requireEmailConfirm: body.requireEmailConfirm,
  })

  await recordSocialAudit(event, client, {
    tenantId,
    actorId: user.id,
    action: 'briefing_link.created',
    entityType: 'social_briefing_link',
    entityId: created.id,
    after: { briefing_id: created.briefingId, expires_at: created.expiresAt },
  })

  const origin = getRequestURL(event).origin
  return {
    data: {
      ...created,
      url: `${origin}${created.urlPath}`,
    },
  }
})
