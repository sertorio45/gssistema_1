import { getRouterParam, readBody } from 'h3'
import { z } from 'zod'

import { requireOrganizationContext } from '~/server/utils/organization-access'

const schema = z.object({
  tenantId: z.string().uuid(),
  isPrimary: z.boolean().default(false),
})

export default defineEventHandler(async (event) => {
  const organizationId = String(getRouterParam(event, 'id'))
  const input = schema.parse(await readBody(event))
  const { client } = await requireOrganizationContext(event, organizationId, { platformOnly: true })

  const { data, error } = await client
    .from('organization_tenants')
    .upsert({
      organization_id: organizationId,
      tenant_id: input.tenantId,
      is_primary: input.isPrimary,
    }, { onConflict: 'organization_id,tenant_id' })
    .select('*')
    .single()

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  return { data }
})
