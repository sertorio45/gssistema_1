import { getRouterParam, readBody } from 'h3'
import { z } from 'zod'

import { recordSocialAudit } from '~/server/utils/social-audit'
import { SOCIAL_SLA_STAGE_KEYS } from '~/server/utils/social-packages'
import { requireSocialContext } from '~/server/utils/social-context'

const bodySchema = z.object({
  stages: z.array(z.object({
    stageKey: z.enum(SOCIAL_SLA_STAGE_KEYS),
    maxBusinessDays: z.number().int().min(1).max(90),
  })).min(1).max(20),
})

export default defineEventHandler(async (event) => {
  const packageId = String(getRouterParam(event, 'id'))
  const body = bodySchema.parse(await readBody(event))
  const { client, tenantId, user } = await requireSocialContext(event, 'marketing.social.sla.manage')

  const { data: pkg } = await client
    .from('social_client_packages')
    .select('id')
    .eq('id', packageId)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (!pkg)
    throw createError({ statusCode: 404, statusMessage: 'Pacote não encontrado' })

  await client
    .from('social_package_sla_stages')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('package_id', packageId)

  const { data, error } = await client
    .from('social_package_sla_stages')
    .insert(body.stages.map(stage => ({
      tenant_id: tenantId,
      package_id: packageId,
      stage_key: stage.stageKey,
      max_business_days: stage.maxBusinessDays,
    })))
    .select('*')

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  await recordSocialAudit(event, client, {
    tenantId,
    actorId: user.id,
    action: 'package.sla.updated',
    entityType: 'social_client_package',
    entityId: packageId,
  })

  return { data: data || [] }
})
