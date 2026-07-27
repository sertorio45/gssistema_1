import { readBody } from 'h3'
import { z } from 'zod'

import { recordSocialAudit } from '~/server/utils/social-audit'
import { requireSocialContext } from '~/server/utils/social-context'

const bodySchema = z.object({
  toneOfVoice: z.string().max(5000).optional(),
  audience: z.string().max(5000).optional(),
  allowedWords: z.array(z.string().max(80)).max(100).optional(),
  forbiddenWords: z.array(z.string().max(80)).max(100).optional(),
  ctas: z.array(z.string().max(200)).max(50).optional(),
  hashtags: z.array(z.string().max(80)).max(100).optional(),
  colors: z.array(z.record(z.unknown())).max(20).optional(),
  fonts: z.array(z.record(z.unknown())).max(20).optional(),
  products: z.array(z.record(z.unknown())).max(50).optional(),
  competitors: z.array(z.record(z.unknown())).max(50).optional(),
  restrictions: z.string().max(5000).optional(),
  legalNotes: z.string().max(5000).optional(),
  logoAssetIds: z.array(z.string().uuid()).max(20).optional(),
})

export default defineEventHandler(async (event) => {
  const body = bodySchema.parse(await readBody(event))
  const { client, tenantId, user } = await requireSocialContext(event, 'marketing.social.brand_guide.manage')

  const payload = {
    tenant_id: tenantId,
    tone_of_voice: body.toneOfVoice ?? '',
    audience: body.audience ?? '',
    allowed_words: body.allowedWords ?? [],
    forbidden_words: body.forbiddenWords ?? [],
    ctas: body.ctas ?? [],
    hashtags: body.hashtags ?? [],
    colors: body.colors ?? [],
    fonts: body.fonts ?? [],
    products: body.products ?? [],
    competitors: body.competitors ?? [],
    restrictions: body.restrictions ?? '',
    legal_notes: body.legalNotes ?? '',
    logo_asset_ids: body.logoAssetIds ?? [],
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await client
    .from('social_brand_guides')
    .upsert(payload, { onConflict: 'tenant_id' })
    .select('*')
    .single()

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  await recordSocialAudit(event, client, {
    tenantId,
    actorId: user.id,
    action: 'brand_guide.updated',
    entityType: 'social_brand_guide',
    entityId: data.id,
  })

  return { data }
})
