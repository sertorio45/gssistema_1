import { serverSupabaseUser } from '#supabase/server'

import { defineEventHandler, getRequestURL } from 'h3'

import { requireWorkspaceContext } from '~/server/utils/workspace-context'

/**
 * Publishes the resolved workspace on `event.context.auth` for the legacy CRM and
 * Articles handlers. Resolution is delegated to `requireWorkspaceContext`, so an
 * agency collaborator opening a client workspace is scoped the same way here as
 * in the modern handlers.
 *
 * Never throws: authorization belongs to the handlers, this only carries context.
 */
export default defineEventHandler(async (event) => {
  const pathname = getRequestURL(event).pathname
  if (!pathname.startsWith('/api/'))
    return

  // Workspace bootstrap resolves (and lists orgs/tenants) on its own — avoid a
  // duplicate full resolve before the handler runs.
  if (pathname === '/api/workspace/context' || pathname.startsWith('/api/workspace/context/'))
    return

  try {
    const user = await serverSupabaseUser(event).catch(() => null)
    if (!user)
      return

    const context = await requireWorkspaceContext(event)

    event.context.auth = {
      userId: context.userId,
      role: context.effectiveRole,
      tenantId: context.tenantId,
      organizationId: context.organization?.id ?? null,
      isPlatformStaff: context.isPlatformStaff,
    }
  }
  catch {
    // A rejected context simply means the handler will authorize on its own.
  }
})
