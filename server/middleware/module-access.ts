import type { WorkspaceModule } from '~/server/utils/workspace-context'
import { serverSupabaseUser } from '#supabase/server'

import { getRequestURL } from 'h3'

import { isStaffUser } from '~/server/utils/tenant-role'
import { requireWorkspaceContext } from '~/server/utils/workspace-context'

const MODULE_BY_PREFIX: Array<[string, WorkspaceModule]> = [
  ['/api/crm', 'crm'],
  ['/api/articles', 'article'],
  ['/api/marketing', 'marketing'],
  ['/api/whatsapp', 'whatsapp'],
]

/** Browser OAuth returns here; the exchange itself is authenticated via `oauth_states`. */
function isOAuthCallbackPath(path: string): boolean {
  return /\/oauth\/[^/]+\/callback\/?$/.test(path)
}

/**
 * Blocks module endpoints when the tenant did not contract the module, or when
 * the user cannot reach the requested tenant at all. The decision itself lives in
 * `requireWorkspaceContext`, so this middleware and the handlers cannot drift.
 */
export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname

  // CRM Meta CAPI reuses marketing OAuth start URLs historically — never gate
  // the provider callback on a contracted module (session cookie may be present).
  if (isOAuthCallbackPath(path))
    return

  const match = MODULE_BY_PREFIX.find(([prefix]) => path.startsWith(prefix))
  if (!match)
    return

  // Machine-to-machine callers (pg_cron worker) authenticate inside the handler.
  const user = await serverSupabaseUser(event).catch(() => null)
  if (!user)
    return

  // Platform staff reach every module; the handlers still scope the data.
  if (isStaffUser(user))
    return

  await requireWorkspaceContext(event, {
    requireTenant: true,
    module: match[1],
  })
})
