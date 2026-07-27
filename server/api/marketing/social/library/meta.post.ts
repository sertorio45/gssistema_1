import { readBody } from 'h3'
import { z } from 'zod'

import { requireSocialContext } from '~/server/utils/social-context'

export default defineEventHandler(async (event) => {
  const { client, tenantId, user } = await requireSocialContext(event, 'marketing.social.library.manage')
  const body = z.object({
    kind: z.enum(['folder', 'tag']),
    name: z.string().trim().min(1).max(120),
    parentId: z.string().uuid().nullable().optional(),
    color: z.string().max(20).nullable().optional(),
  }).parse(await readBody(event))

  if (body.kind === 'folder') {
    const { data, error } = await client
      .from('media_folders')
      .insert({
        tenant_id: tenantId,
        name: body.name,
        parent_id: body.parentId || null,
        created_by: user.id,
      })
      .select('*')
      .single()
    if (error)
      throw createError({ statusCode: 400, statusMessage: error.message })
    return { data }
  }

  const { data, error } = await client
    .from('media_tags')
    .insert({
      tenant_id: tenantId,
      name: body.name,
      color: body.color || null,
    })
    .select('*')
    .single()
  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })
  return { data }
})
