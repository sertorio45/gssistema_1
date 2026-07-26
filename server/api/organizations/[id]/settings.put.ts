import { getRouterParam, readBody } from 'h3'
import { z } from 'zod'

import {
  assertAgencyOrganization,
  extractAgencyBranding,
  mergeAgencyBranding,
} from '~/server/utils/agency-ops'
import { recordAuditEvent } from '~/server/utils/audit-events'
import { requireWorkspaceContext } from '~/server/utils/workspace-context'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

const schema = z.object({
  branding: z.object({
    commercial_name: z.string().trim().max(160).nullable().optional(),
    logo_url: z.string().url().nullable().optional().or(z.literal('').transform(() => null)),
    primary_color: z.string().trim().max(32).nullable().optional(),
    custom_domain: z.string().trim().max(255).nullable().optional(),
    invite_display_name: z.string().trim().max(160).nullable().optional(),
    notification_signature: z.string().trim().max(500).nullable().optional(),
  }),
})

export default defineEventHandler(async (event) => {
  const { id: organizationId } = paramsSchema.parse({ id: getRouterParam(event, 'id') })
  const input = schema.parse(await readBody(event))

  const context = await requireWorkspaceContext(event, {
    organizationId,
    capability: 'organization.manage',
  })

  const organization = assertAgencyOrganization(context)
  const before = extractAgencyBranding(organization.settings)
  const nextSettings = mergeAgencyBranding(organization.settings, input.branding)

  const { data, error } = await context.client
    .from('organizations')
    .update({ settings: nextSettings })
    .eq('id', organizationId)
    .select('id, name, slug, type, is_active, settings')
    .single()

  if (error)
    throw createError({ statusCode: 400, statusMessage: error.message })

  await recordAuditEvent(event, context.client, {
    organizationId,
    actorId: context.userId,
    action: 'agency.settings.update',
    entityType: 'organization',
    entityId: organizationId,
    before: { branding: before },
    after: { branding: extractAgencyBranding(data.settings) },
  })

  return {
    data: {
      organization: {
        id: data.id,
        name: data.name,
        slug: data.slug,
        type: data.type,
        is_active: data.is_active,
      },
      branding: extractAgencyBranding(data.settings),
    },
  }
})
