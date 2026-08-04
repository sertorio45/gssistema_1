import type { SupabaseClient } from '@supabase/supabase-js'
import { createError, getRequestURL } from 'h3'

export interface InviteOrLinkResult {
  userId: string
  email: string
  invite_sent: boolean
  existing_user: boolean
}

function isAlreadyRegisteredError(error: { message?: string, code?: string, status?: number } | null): boolean {
  if (!error)
    return false
  const message = String(error.message || '').toLowerCase()
  return (
    message.includes('already been registered')
    || message.includes('already registered')
    || message.includes('user already exists')
    || error.code === 'email_exists'
    || error.status === 422
  )
}

/**
 * Finds auth.users by email through the existing SECURITY DEFINER RPC
 * (avoids scanning listUsers).
 */
export async function findAuthUserIdByEmail(
  client: SupabaseClient,
  email: string,
): Promise<string | null> {
  const { data, error } = await client.rpc('auth_find_user_id_by_email', {
    p_email: email.trim().toLowerCase(),
  })

  if (error) {
    console.error('[auth-invite] auth_find_user_id_by_email failed', error.message)
    return null
  }

  return data ? String(data) : null
}

/**
 * Invites a new user with Supabase Auth's default "Invite User" email
 * (`inviteUserByEmail` → mailer template invite), or returns the existing user id.
 *
 * Does not set authorization claims in user_metadata — store roles in
 * `user_tenant_role` / memberships instead.
 */
export async function inviteOrLinkAuthUserByEmail(
  client: SupabaseClient,
  options: {
    email: string
    name?: string
    redirectTo: string
    /** Extra non-authz metadata for {{ .Data }} in the invite template. */
    metadata?: Record<string, unknown>
  },
): Promise<InviteOrLinkResult> {
  const email = options.email.trim().toLowerCase()
  if (!email) {
    throw createError({ statusCode: 422, statusMessage: 'E-mail do convite é obrigatório' })
  }

  const existingId = await findAuthUserIdByEmail(client, email)
  if (existingId) {
    return {
      userId: existingId,
      email,
      invite_sent: false,
      existing_user: true,
    }
  }

  const displayName = options.name?.trim() || email.split('@')[0]

  const { data: invited, error: inviteError } = await client.auth.admin.inviteUserByEmail(email, {
    data: {
      name: displayName,
      ...(options.metadata || {}),
    },
    redirectTo: options.redirectTo,
  })

  if (inviteError || !invited.user) {
    if (isAlreadyRegisteredError(inviteError)) {
      const racedId = await findAuthUserIdByEmail(client, email)
      if (racedId) {
        return {
          userId: racedId,
          email,
          invite_sent: false,
          existing_user: true,
        }
      }
    }

    throw createError({
      statusCode: 400,
      statusMessage: inviteError?.message || 'Não foi possível enviar o convite por e-mail',
    })
  }

  return {
    userId: invited.user.id,
    email,
    invite_sent: true,
    existing_user: false,
  }
}

export function resolveAuthRedirectOrigin(event: Parameters<typeof getRequestURL>[0]): string {
  return (
    process.env.NUXT_PUBLIC_SITE_URL
    || process.env.SITE_URL
    || getRequestURL(event).origin
  )
}

export interface ResendInviteResult {
  email: string
  invite_sent: boolean
  method: 'invite' | 'recovery'
  user_id: string
}

/**
 * Resends access email without recreating the tenant.
 * - New email → inviteUserByEmail (Invite User template)
 * - Existing user → recovery/reset mail so they can set or reset the password
 *   (same mailer; redirect lands on /confirm → /invite or /reset-password)
 */
export async function resendClientAccessEmail(
  client: SupabaseClient,
  options: {
    email: string
    name?: string
    /** Prefer /confirm?flow=invite for first-time invited users. */
    redirectTo: string
  },
): Promise<ResendInviteResult> {
  const email = options.email.trim().toLowerCase()
  if (!email) {
    throw createError({ statusCode: 422, statusMessage: 'E-mail é obrigatório' })
  }

  const existingId = await findAuthUserIdByEmail(client, email)

  if (!existingId) {
    const invited = await inviteOrLinkAuthUserByEmail(client, {
      email,
      name: options.name,
      redirectTo: options.redirectTo,
    })
    return {
      email: invited.email,
      invite_sent: invited.invite_sent,
      method: 'invite',
      user_id: invited.userId,
    }
  }

  const { data: existingUser, error: userError } = await client.auth.admin.getUserById(existingId)
  if (userError || !existingUser.user) {
    throw createError({
      statusCode: 400,
      statusMessage: userError?.message || 'Usuário não encontrado no Auth',
    })
  }

  // Recovery email works for invited-but-pending and for returning users.
  // Redirect keeps flow=invite so /confirm can send first-time users to /invite.
  const { error: recoveryError } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: options.redirectTo,
  })

  if (recoveryError) {
    throw createError({
      statusCode: 400,
      statusMessage: recoveryError.message || 'Não foi possível reenviar o e-mail de acesso',
    })
  }

  return {
    email,
    invite_sent: true,
    method: 'recovery',
    user_id: existingId,
  }
}
