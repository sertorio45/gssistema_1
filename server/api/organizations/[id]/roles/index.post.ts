import { getRouterParam, readBody } from 'h3'
import { z } from 'zod'

import { recordAuditEvent } from '~/server/utils/audit-events'
import {
  assertAssignableCapabilities,
  buildRoleSlug,
  replaceRoleCapabilities,
} from '~/server/utils/organization-roles'
import { requireWorkspaceContext } from '~/server/utils/workspace-context'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).default(''),
  slug: z.string().trim().min(2).max(60).regex(/^[a-z][a-z0-9_-]*$/).optional(),
  capabilities: z.array(z.string()).default([]),
  duplicateFromRoleId: z.string().uuid().optional(),
})

export default defineEventHandler(async (event) => {
  const { id: organizationId } = paramsSchema.parse({ id: getRouterParam(event, 'id') })
  const input = schema.parse(await readBody(event))

  const context = await requireWorkspaceContext(event, {
    organizationId,
    capability: 'organization.roles.manage',
  })

  assertAssignableCapabilities(context.capabilities, input.capabilities)

  let capabilities = [...new Set(input.capabilities)]
  let description = input.description

  if (input.duplicateFromRoleId) {
    const { data: source } = await context.client
      .from('organization_roles')
      .select('id, description, organization_id')
      .eq('id', input.duplicateFromRoleId)
      .eq('organization_id', organizationId)
      .maybeSingle()

    if (!source)
      throw createError({ statusCode: 404, statusMessage: 'Cargo de origem não encontrado' })

    if (!description)
      description = String(source.description || '')

    const { data: sourceCaps } = await context.client
      .from('organization_role_capabilities')
      .select('capability, allowed')
      .eq('role_id', input.duplicateFromRoleId)
      .eq('allowed', true)

    const sourceKeys = (sourceCaps || []).map((row: any) => String(row.capability))
    assertAssignableCapabilities(context.capabilities, sourceKeys)
    if (!capabilities.length)
      capabilities = sourceKeys
  }

  const slug = input.slug || buildRoleSlug(input.name)

  const { data, error } = await context.client
    .from('organization_roles')
    .insert({
      organization_id: organizationId,
      name: input.name,
      slug,
      description,
      organization_type: context.organization!.type,
      is_system: false,
      is_default: false,
      is_editable: true,
      is_protected: false,
      legacy_app_role: 'atendente',
      created_by: context.userId,
    })
    .select('*')
    .single()

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  await replaceRoleCapabilities(context.client, data.id, capabilities)

  await recordAuditEvent(event, context.client, {
    tenantId: context.organization!.anchorTenantId,
    organizationId,
    actorId: context.userId,
    action: 'organization.role.create',
    entityType: 'organization_role',
    entityId: data.id,
    after: { name: input.name, slug, capabilities },
  })

  return { data: { ...data, capabilities: capabilities.map(capability => ({ capability, allowed: true })) } }
})
