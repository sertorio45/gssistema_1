import type { SupabaseClient } from '@supabase/supabase-js'
import process from 'node:process'
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

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
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
    p_email: normalizeEmail(email),
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
  const email = normalizeEmail(options.email)
  if (!email)
    throw createError({ statusCode: 422, statusMessage: 'E-mail do convite é obrigatório' })

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

export interface AuthAccessState {
  userId: string
  email: string
  /** Never signed in — invite still pending. */
  pending: boolean
  isPlatformStaff: boolean
  lastSignInAt: string | null
}

/** Reads the Auth state used to decide invite vs recovery, and to guard deletions. */
export async function readAuthAccessState(
  client: SupabaseClient,
  userId: string,
): Promise<AuthAccessState | null> {
  const { data, error } = await client.auth.admin.getUserById(userId)
  if (error || !data.user)
    return null

  const user = data.user
  const globalRole = String((user.app_metadata as any)?.role || '')

  return {
    userId: user.id,
    email: normalizeEmail(user.email || ''),
    pending: !user.last_sign_in_at,
    isPlatformStaff: globalRole === 'admin' || globalRole === 'funcionario',
    lastSignInAt: (user as any).last_sign_in_at ?? null,
  }
}

/**
 * A pending auth user may only be recycled when it belongs to this tenant alone
 * and has no organization membership. Prevents deleting shared/staff accounts.
 */
export async function canRecyclePendingUser(
  client: SupabaseClient,
  input: { userId: string, tenantId: string },
): Promise<boolean> {
  const [{ data: tenantRoles }, { data: memberships }] = await Promise.all([
    client.from('user_tenant_role').select('tenant_id').eq('user_id', input.userId),
    client.from('organization_memberships').select('id').eq('user_id', input.userId).limit(1),
  ])

  if (memberships && memberships.length)
    return false

  const tenantIds = new Set((tenantRoles || []).map((row: any) => String(row.tenant_id)))
  tenantIds.delete(input.tenantId)
  return tenantIds.size === 0
}

export interface ResendAccessResult {
  email: string
  user_id: string
  /** Auth mailer actually dispatched an email. */
  email_sent: boolean
  method: 'invite' | 'recovery'
  /** Manual fallback link the operator can share. */
  action_link: string | null
  link_error: string | null
}

/** Builds a one-time access link the operator can deliver by hand. */
async function generateShareableLink(
  client: SupabaseClient,
  input: { type: 'recovery' | 'magiclink', email: string, redirectTo: string },
): Promise<{ link: string | null, error: string | null }> {
  const { data, error } = await client.auth.admin.generateLink({
    type: input.type,
    email: input.email,
    options: { redirectTo: input.redirectTo },
  })

  const link = (data as any)?.properties?.action_link ?? null
  if (error || !link)
    return { link: null, error: error?.message || 'Link não gerado' }

  return { link, error: null }
}

/**
 * Resends access for a client workspace without recreating the tenant.
 *
 * Always tries to (1) dispatch an email through the Auth mailer and
 * (2) return a shareable link so the operator can deliver it manually.
 */
export async function resendClientAccessEmail(
  client: SupabaseClient,
  options: {
    email: string
    name?: string
    tenantId: string
    redirectTo: string
  },
): Promise<ResendAccessResult> {
  const email = normalizeEmail(options.email)
  if (!email)
    throw createError({ statusCode: 422, statusMessage: 'E-mail é obrigatório' })

  const existingId = await findAuthUserIdByEmail(client, email)

  // Brand new address: plain invite (mailer works) + link fallback.
  if (!existingId) {
    const invited = await inviteOrLinkAuthUserByEmail(client, {
      email,
      name: options.name,
      redirectTo: options.redirectTo,
    })
    const fallback = await generateShareableLink(client, {
      type: 'recovery',
      email,
      redirectTo: options.redirectTo,
    })

    return {
      email: invited.email,
      user_id: invited.userId,
      email_sent: invited.invite_sent,
      method: 'invite',
      action_link: fallback.link,
      link_error: fallback.error,
    }
  }

  const state = await readAuthAccessState(client, existingId)
  if (!state) {
    throw createError({ statusCode: 400, statusMessage: 'Usuário não encontrado no Auth' })
  }

  if (state.isPlatformStaff) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Este e-mail pertence a um usuário da plataforma. Use outro endereço para o cliente.',
    })
  }

  if (state.pending) {
    const recyclable = await canRecyclePendingUser(client, {
      userId: existingId,
      tenantId: options.tenantId,
    })

    if (recyclable) {
      const { error: deleteError } = await client.auth.admin.deleteUser(existingId)
      if (deleteError) {
        throw createError({
          statusCode: 400,
          statusMessage: deleteError.message || 'Não foi possível reiniciar o convite',
        })
      }

      const invited = await inviteOrLinkAuthUserByEmail(client, {
        email,
        name: options.name,
        redirectTo: options.redirectTo,
      })
      const fallback = await generateShareableLink(client, {
        type: 'recovery',
        email,
        redirectTo: options.redirectTo,
      })

      return {
        email: invited.email,
        user_id: invited.userId,
        email_sent: invited.invite_sent,
        method: 'invite',
        action_link: fallback.link,
        link_error: fallback.error,
      }
    }
  }

  // Activated (or shared) account: recovery mail + shareable link.
  const { error: recoveryError } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: options.redirectTo,
  })

  let fallback = await generateShareableLink(client, {
    type: 'recovery',
    email,
    redirectTo: options.redirectTo,
  })

  if (!fallback.link) {
    fallback = await generateShareableLink(client, {
      type: 'magiclink',
      email,
      redirectTo: options.redirectTo,
    })
  }

  if (recoveryError && !fallback.link) {
    throw createError({
      statusCode: 400,
      statusMessage: recoveryError.message || 'Não foi possível reenviar o acesso',
    })
  }

  return {
    email,
    user_id: existingId,
    email_sent: !recoveryError,
    method: 'recovery',
    action_link: fallback.link,
    link_error: fallback.error,
  }
}
