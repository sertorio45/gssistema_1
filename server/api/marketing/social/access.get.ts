import type { SocialCapability } from '~/server/utils/social-context'

import { holdsCapability, MARKETING_SOCIAL_CAPABILITIES } from '~/constants/workspace'
import { requireSocialContext } from '~/server/utils/social-context'

/** Exposes the already-resolved workspace capabilities — no second role matrix. */
export default defineEventHandler(async (event) => {
  const context = await requireSocialContext(event, 'marketing.social.read')

  const capabilities = (MARKETING_SOCIAL_CAPABILITIES as readonly SocialCapability[])
    .filter(capability => holdsCapability(context.workspace.capabilities, capability))

  return {
    tenantId: context.tenantId,
    role: context.role,
    organizationRoleId: context.workspace.organizationRoleId,
    organizationRoleSlug: context.workspace.organizationRoleSlug,
    capabilities,
  }
})
