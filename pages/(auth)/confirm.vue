<script setup lang="ts">
/**
 * Auth callback landing.
 *
 * Supports:
 * - token_hash + type (recommended email templates — no PKCE)
 * - ?code= PKCE (handled mainly by @nuxtjs/supabase; we never double-exchange)
 * - #access_token hash (implicit)
 *
 * invite → /invite · recovery → /reset-password · else → /
 */
import type { EmailOtpType } from '@supabase/supabase-js'

definePageMeta({
  layout: 'blank',
})

const route = useRoute()
const user = useSupabaseUser()
const client = useSupabaseClient()

const status = ref('Confirmando autenticação...')
const errorMessage = ref('')

function readHashParams(): URLSearchParams | null {
  if (!import.meta.client || !window.location.hash)
    return null
  return new URLSearchParams(window.location.hash.replace(/^#/, ''))
}

function readHashType(): string | null {
  return readHashParams()?.get('type') ?? null
}

function isInviteFlow(): boolean {
  const flow = String(route.query.flow || '')
  const type = String(route.query.type || '')
  const hashType = readHashType() || ''
  return flow === 'invite' || type === 'invite' || hashType === 'invite'
}

function isRecoveryFlow(): boolean {
  const type = String(route.query.type || '')
  const hashType = readHashType() || ''
  return type === 'recovery' || hashType === 'recovery'
}

function otpType(): EmailOtpType | null {
  const raw = String(route.query.type || readHashType() || '')
  const allowed: EmailOtpType[] = [
    'signup',
    'invite',
    'magiclink',
    'recovery',
    'email_change',
    'email',
  ]
  return allowed.includes(raw as EmailOtpType) ? (raw as EmailOtpType) : null
}

async function waitForSession(attempts = 10): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    if (user.value)
      return true
    const { data } = await client.auth.getSession()
    if (data.session?.user)
      return true
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  return Boolean(user.value)
}

function friendlyAuthError(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('expired') || lower.includes('otp_expired')) {
    return 'Este link expirou. Use “Reenviar convite” na lista de clientes e abra o e-mail mais recente.'
  }
  if (lower.includes('verifier') || lower.includes('code challenge')) {
    return 'O link de autenticação é inválido neste navegador. Peça um novo convite e abra no mesmo dispositivo, ou use o link com token do e-mail.'
  }
  return message || 'Não foi possível confirmar o link.'
}

async function resolve() {
  try {
    // Surface errors returned by Supabase on the redirect URL.
    if (route.query.error || route.query.error_description) {
      errorMessage.value = friendlyAuthError(
        String(route.query.error_description || route.query.error || ''),
      )
      status.value = 'Link inválido'
      return
    }

    const tokenHash = String(
      route.query.token_hash
      || route.query.tokenHash
      || '',
    ).trim()
    const type = otpType()
    const code = route.query.code ? String(route.query.code) : ''

    // 1) Preferred: email templates using {{ .TokenHash }} → no PKCE.
    if (tokenHash && type) {
      status.value = 'Validando acesso...'
      const { error } = await client.auth.verifyOtp({
        token_hash: tokenHash,
        type,
      })
      if (error) {
        errorMessage.value = friendlyAuthError(error.message)
        status.value = 'Não foi possível confirmar'
        return
      }
    }
    else if (code) {
      // 2) PKCE: let @nuxtjs/supabase finish first — never race a second exchange.
      status.value = 'Validando sessão...'
      let hasSession = await waitForSession(8)

      if (!hasSession) {
        const { error } = await client.auth.exchangeCodeForSession(code)
        if (error) {
          // Module may have consumed the code already; session can still exist.
          hasSession = await waitForSession(6)
          if (!hasSession) {
            errorMessage.value = friendlyAuthError(error.message)
            status.value = 'Não foi possível confirmar'
            return
          }
        }
      }
    }
    else {
      // 3) Implicit hash tokens / session already hydrated.
      status.value = 'Carregando sessão...'
      await waitForSession(6)
    }

    const hasSession = await waitForSession(4)
    if (!hasSession) {
      errorMessage.value = 'Este link é inválido ou já foi usado. Solicite um novo convite.'
      status.value = 'Não foi possível confirmar'
      return
    }

    if (isInviteFlow()) {
      status.value = 'Redirecionando para criar sua senha...'
      await navigateTo('/invite', { replace: true })
      return
    }

    if (isRecoveryFlow()) {
      status.value = 'Redirecionando para redefinir a senha...'
      await navigateTo('/reset-password', { replace: true })
      return
    }

    await navigateTo('/', { replace: true })
  }
  catch (error: any) {
    errorMessage.value = friendlyAuthError(error?.message || '')
    status.value = 'Erro'
  }
}

onMounted(() => {
  void resolve()
})
</script>

<template>
  <div class="flex min-h-svh flex-col items-center justify-center gap-3 bg-muted p-6">
    <p class="text-sm text-muted-foreground">
      {{ status }}
    </p>
    <p v-if="errorMessage" class="max-w-sm text-center text-sm text-destructive">
      {{ errorMessage }}
    </p>
    <div v-if="errorMessage" class="flex flex-col items-center gap-2 text-sm">
      <NuxtLink to="/login" class="font-medium underline underline-offset-4">
        Ir para o login
      </NuxtLink>
      <p class="max-w-sm text-center text-xs text-muted-foreground">
        Peça à agência para usar “Reenviar convite” e abra apenas o e-mail mais novo.
      </p>
    </div>
  </div>
</template>
