import { readBody } from 'h3'
import { z } from 'zod'

import { recordSocialAudit } from '~/server/utils/social-audit'
import {
  SOCIAL_AUTOMATION_TRIGGERS,
  upsertAutomationRule,
} from '~/server/utils/social-automations'
import { requireSocialContext } from '~/server/utils/social-context'

const bodySchema = z.object({
  triggerKey: z.enum(SOCIAL_AUTOMATION_TRIGGERS),
  enabled: z.boolean(),
  config: z.record(z.unknown()).optional(),
})

export default defineEventHandler(async (event) => {
  const body = bodySchema.parse(await readBody(event))
  const { client, tenantId, user } = await requireSocialContext(
    event,
    'marketing.social.automations.manage',
  )

  const data = await upsertAutomationRule(client, {
    tenantId,
    triggerKey: body.triggerKey,
    enabled: body.enabled,
    config: body.config,
  })

  await recordSocialAudit(event, client, {
    tenantId,
    actorId: user.id,
    action: 'automation.rule.upserted',
    entityType: 'social_automation_rule',
    entityId: data.id,
    after: { triggerKey: body.triggerKey, enabled: body.enabled },
  })

  return { data }
})
