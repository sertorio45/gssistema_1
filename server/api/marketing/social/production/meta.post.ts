import { readBody } from 'h3'
import { z } from 'zod'

import { recordSocialAudit } from '~/server/utils/social-audit'
import { requireSocialContext } from '~/server/utils/social-context'
import { SOCIAL_PRODUCTION_PRIORITIES } from '~/types/marketing-social'

const bodySchema = z.object({
  postId: z.string().uuid(),
  tenantId: z.string().uuid().optional(),
  productionPriority: z.enum(SOCIAL_PRODUCTION_PRIORITIES).optional(),
  productionDueAt: z.string().datetime({ offset: true }).nullable().optional(),
  copyOwnerId: z.string().uuid().nullable().optional(),
  designOwnerId: z.string().uuid().nullable().optional(),
  publishOwnerId: z.string().uuid().nullable().optional(),
})

/** Updates operational metadata without creating an editorial revision. */
export default defineEventHandler(async (event) => {
  const body = bodySchema.parse(await readBody(event))
  const { client, tenantId, user } = await requireSocialContext(
    event,
    'marketing.social.production.manage',
    body.tenantId,
  )

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (body.productionPriority !== undefined)
    updatePayload.production_priority = body.productionPriority
  if (body.productionDueAt !== undefined)
    updatePayload.production_due_at = body.productionDueAt
  if (body.copyOwnerId !== undefined)
    updatePayload.copy_owner_id = body.copyOwnerId
  if (body.designOwnerId !== undefined)
    updatePayload.design_owner_id = body.designOwnerId
  if (body.publishOwnerId !== undefined)
    updatePayload.publish_owner_id = body.publishOwnerId

  if (Object.keys(updatePayload).length <= 1)
    throw createError({ statusCode: 400, statusMessage: 'Nada para atualizar' })

  const { data, error } = await client
    .from('social_posts')
    .update(updatePayload)
    .eq('id', body.postId)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .select('id, production_priority, production_due_at, copy_owner_id, design_owner_id, publish_owner_id')
    .maybeSingle()

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })
  if (!data)
    throw createError({ statusCode: 404, statusMessage: 'Conteúdo não encontrado' })

  await recordSocialAudit(event, client, {
    tenantId,
    actorId: user.id,
    action: 'production.meta.updated',
    entityType: 'social_post',
    entityId: body.postId,
    after: data,
  })

  return { data }
})
