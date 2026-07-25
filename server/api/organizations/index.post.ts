import { readBody } from 'h3'
import { z } from 'zod'

import { requireOrganizationContext } from '~/server/utils/organization-access'

const schema = z.object({
  name: z.string().trim().min(2).max(150),
  slug: z.string().trim().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  type: z.enum(['agency', 'direct']),
  tenantId: z.string().uuid(),
})

export default defineEventHandler(async (event) => {
  const input = schema.parse(await readBody(event))
  const { client } = await requireOrganizationContext(event, undefined, { platformOnly: true })

  const { data, error } = await client
    .from('organizations')
    .insert({
      tenant_id: input.tenantId,
      name: input.name,
      slug: input.slug,
      type: input.type,
    })
    .select('*')
    .single()

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  await client.from('organization_tenants').insert({
    tenant_id: input.tenantId,
    organization_id: data.id,
    is_primary: true,
  })

  return { data }
})
