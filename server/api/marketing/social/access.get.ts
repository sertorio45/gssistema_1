import type { SocialCapability } from '~/server/utils/social-context'
import { requireSocialContext } from '~/server/utils/social-context'

const ALL_CAPABILITIES: SocialCapability[] = [
  'marketing.social.read',
  'marketing.social.create',
  'marketing.social.comment',
  'marketing.social.approve',
  'marketing.social.publish',
  'marketing.social.integrations',
  'marketing.social.manage',
]

export default defineEventHandler(async (event) => {
  const context = await requireSocialContext(event, 'marketing.social.read')
  const base = context.isPlatformStaff || ['admin', 'funcionario', 'cliente'].includes(context.role)
    ? new Set(ALL_CAPABILITIES)
    : new Set<SocialCapability>([
      'marketing.social.read',
      'marketing.social.create',
      'marketing.social.comment',
    ])

  const { data: overrides } = await context.client
    .from('tenant_capability_grants')
    .select('capability, allowed')
    .eq('tenant_id', context.tenantId)
    .eq('user_id', context.user.id)

  for (const override of overrides || []) {
    const capability = override.capability as SocialCapability
    if (override.allowed)
      base.add(capability)
    else
      base.delete(capability)
  }

  return {
    tenantId: context.tenantId,
    role: context.role,
    capabilities: [...base],
  }
})
