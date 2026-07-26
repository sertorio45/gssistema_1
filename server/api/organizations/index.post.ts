import { readBody } from 'h3'
import { z } from 'zod'

import { recordAuditEvent } from '~/server/utils/audit-events'
import { requireWorkspaceContext } from '~/server/utils/workspace-context'

const schema = z.object({
  name: z.string().trim().min(2).max(150),
  slug: z.string().trim().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  type: z.enum(['agency', 'direct']),
  tenantId: z.string().uuid(),
})

/** Creating agencies and direct customers is a commercial act reserved to the platform. */
export default defineEventHandler(async (event) => {
  const input = schema.parse(await readBody(event))
  const context = await requireWorkspaceContext(event, {
    organizationId: null,
    platformOnly: true,
    capability: 'platform.organizations.manage',
  })

  const { data: anchorTenant } = await context.client
    .from('tenant')
    .select('id')
    .eq('id', input.tenantId)
    .maybeSingle()

  if (!anchorTenant)
    throw createError({ statusCode: 404, statusMessage: 'Empresa principal não encontrada' })

  const { data, error } = await context.client
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

  const { error: linkError } = await context.client
    .from('organization_tenants')
    .upsert({
      tenant_id: input.tenantId,
      organization_id: data.id,
      is_primary: true,
      relationship_type: 'owner',
      is_active: true,
      created_by: context.userId,
    }, { onConflict: 'organization_id,tenant_id' })

  if (linkError)
    throw createError({ statusCode: 400, statusMessage: linkError.message })

  await recordAuditEvent(event, context.client, {
    tenantId: input.tenantId,
    organizationId: data.id,
    actorId: context.userId,
    action: 'organization.create',
    entityType: 'organization',
    entityId: data.id,
    after: { name: input.name, slug: input.slug, type: input.type, tenant_id: input.tenantId },
  })

  return { data }
})
