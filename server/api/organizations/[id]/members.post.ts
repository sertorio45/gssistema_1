import { getRouterParam, readBody } from 'h3'
import { z } from 'zod'

import { requireOrganizationContext } from '~/server/utils/organization-access'

const schema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['cliente', 'atendente']),
})

export default defineEventHandler(async (event) => {
  const organizationId = String(getRouterParam(event, 'id'))
  const input = schema.parse(await readBody(event))
  const { client } = await requireOrganizationContext(event, organizationId, { manage: true })
  const { data: organization } = await client
    .from('organizations')
    .select('tenant_id')
    .eq('id', organizationId)
    .maybeSingle()
  if (!organization?.tenant_id)
    throw createError({ statusCode: 409, statusMessage: 'Organização sem empresa principal' })

  const { data, error } = await client
    .from('organization_memberships')
    .upsert({
      organization_id: organizationId,
      tenant_id: organization.tenant_id,
      user_id: input.userId,
      role: input.role,
      is_active: true,
    }, { onConflict: 'organization_id,user_id' })
    .select('*')
    .single()

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  return { data }
})
