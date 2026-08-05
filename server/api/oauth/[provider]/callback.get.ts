import { createError, defineEventHandler } from 'h3'

import {
  handleOAuthProviderCallback,
  toOAuthProvider,
} from '~/server/utils/oauth-callback'

/**
 * Module-neutral OAuth callback (CRM Meta CAPI + Marketing share this URI).
 * Must stay outside `/api/marketing/**` so CRM-only tenants are not blocked
 * by module-access middleware.
 */
export default defineEventHandler(async (event) => {
  const provider = toOAuthProvider(event.context.params?.provider || '')
  if (!provider)
    throw createError({ statusCode: 400, statusMessage: 'Provider inválido' })

  return handleOAuthProviderCallback(event, provider)
})
