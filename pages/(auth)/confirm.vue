<script setup lang="ts">
/**
 * Auth callback landing.
 *
 * Handles every shape Supabase can return, in priority order:
 * 1. `#access_token` + `#refresh_token` (implicit / generateLink → verify redirect)
 * 2. `token_hash` + `type` (email templates using TokenHash, no PKCE)
 * 3. `?code=` (PKCE — @nuxtjs/supabase exchanges it; we never double-exchange)
 *
 * Case 1 must be handled by hand: @supabase/ssr builds the browser client with
 * `flowType: 'pkce'`, and auth-js then rejects implicit callbacks
 * ("Not a valid PKCE flow url") *and* drops the stored session. `setSession`
 * awaits that initialization, so calling it here is race-free.
 *
 * Errors may arrive either as query params or inside the hash fragment.
 */
import type { EmailOtpType } from '@supabase/supabase-js'
import { CheckCircle2, KeyRound, Loader2, MailWarning, RefreshCw } from 'lucide-vue-next'

definePageMeta({
  layout: 'blank',
})

useSeoMeta({
  title: 'Confirmando acesso',
  robots: 'noindex, nofollow',
})

type Phase = 'loading' | 'success' | 'error'

const route = useRoute()
const user = useSupabaseUser()
const client = useSupabaseClient()

const phase = ref<Phase>('loading')
const status = ref('Confirmando seu acesso...')
const detail = ref('Isso leva apenas alguns segundos.')
const errorTitle = ref('')
const errorMessage = ref('')
const errorHint = ref('')

const ALLOWED_OTP_TYPES: EmailOtpType[] = [
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
  'email',
]

function readHashParams(): URLSearchParams {
  if (!import.meta.client || !window.location.hash)
    return new URLSearchParams()
  return new URLSearchParams(window.location.hash.replace(/^#/, ''))
}

const SENSITIVE_QUERY_KEYS = [
  'token_hash',
  'tokenHash',
  'token',
  'code',
  'type',
  'error',
  'error_code',
  'error_description',
]

/**
 * Tokens are credentials: drop them from the fragment *and* the query as soon
 * as they are consumed, so they never reach history, bookmarks or `Referer`.
 */
function stripCredentialsFromUrl() {
  if (!import.meta.client)
    return

  const url = new URL(window.location.href)
  const hadHash = Boolean(url.hash)
  let changed = hadHash

  url.hash = ''
  for (const key of SENSITIVE_QUERY_KEYS) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key)
      changed = true
    }
  }

  if (!changed)
    return

  window.history.replaceState({}, document.title, `${url.pathname}${url.search}`)
}

function resolveFlowType(hash: URLSearchParams): string {
  return String(
    route.query.flow
    || route.query.type
    || hash.get('type')
    || '',
  ).toLowerCase()
}

function otpTypeFrom(hash: URLSearchParams): EmailOtpType | null {
  const raw = String(route.query.type || hash.get('type') || '').toLowerCase()
  return ALLOWED_OTP_TYPES.includes(raw as EmailOtpType) ? (raw as EmailOtpType) : null
}

async function hasActiveSession(): Promise<boolean> {
  if (user.value)
    return true
  const { data } = await client.auth.getSession()
  return Boolean(data.session?.user)
}

async function waitForSession(attempts = 8, delay = 200): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    if (await hasActiveSession())
      return true
    await new Promise(resolve => setTimeout(resolve, delay))
  }
  return false
}

function fail(title: string, message: string, hint = '') {
  phase.value = 'error'
  errorTitle.value = title
  errorMessage.value = message
  errorHint.value = hint
}

function friendlyAuthError(message: string, code = ''): { message: string, hint: string } {
  const lower = `${code} ${message}`.toLowerCase()

  if (lower.includes('expired')) {
    return {
      message: 'O link deste e-mail expirou.',
      hint: 'Peça um novo convite à agência e abra sempre o e-mail mais recente.',
    }
  }

  if (lower.includes('already') || lower.includes('used')) {
    return {
      message: 'Este link já foi utilizado.',
      hint: 'Se você já criou sua senha, entre normalmente pelo login.',
    }
  }

  if (lower.includes('verifier') || lower.includes('code challenge') || lower.includes('pkce')) {
    return {
      message: 'O link foi aberto em um navegador diferente do que iniciou o processo.',
      hint: 'Abra o link do e-mail no mesmo navegador, ou solicite um novo convite.',
    }
  }

  return {
    message: message || 'Não foi possível validar este link.',
    hint: 'Solicite um novo convite e tente novamente.',
  }
}

async function redirectByFlow(flow: string) {
  phase.value = 'success'

  if (flow === 'invite' || flow === 'signup') {
    status.value = 'Acesso confirmado'
    detail.value = 'Redirecionando para criar sua senha...'
    await navigateTo('/invite', { replace: true })
    return
  }

  if (flow === 'recovery') {
    status.value = 'Acesso confirmado'
    detail.value = 'Redirecionando para redefinir sua senha...'
    await navigateTo('/reset-password', { replace: true })
    return
  }

  status.value = 'Tudo certo'
  detail.value = 'Entrando no sistema...'
  await navigateTo('/', { replace: true })
}

async function resolve() {
  const hash = readHashParams()
  const flow = resolveFlowType(hash)

  try {
    // Supabase reports failures via query string or hash fragment.
    const rawError = String(
      route.query.error_description
      || route.query.error
      || hash.get('error_description')
      || hash.get('error')
      || '',
    )
    const rawErrorCode = String(route.query.error_code || hash.get('error_code') || '')

    if (rawError) {
      stripCredentialsFromUrl()
      const friendly = friendlyAuthError(rawError, rawErrorCode)
      fail('Link não pôde ser validado', friendly.message, friendly.hint)
      return
    }

    const accessToken = hash.get('access_token') || ''
    const refreshToken = hash.get('refresh_token') || ''
    const tokenHash = String(route.query.token_hash || route.query.tokenHash || '').trim()
    const otpType = otpTypeFrom(hash)
    const code = route.query.code ? String(route.query.code) : ''

    // 1) Implicit tokens in the fragment (what generateLink/verify redirects produce).
    if (accessToken && refreshToken) {
      status.value = 'Validando acesso...'
      const { error } = await client.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
      stripCredentialsFromUrl()

      if (error && !(await hasActiveSession())) {
        const friendly = friendlyAuthError(error.message)
        fail('Não foi possível confirmar', friendly.message, friendly.hint)
        return
      }
    }
    // 2) Token hash from email templates — no PKCE involved.
    else if (tokenHash && otpType) {
      status.value = 'Validando acesso...'
      const { error } = await client.auth.verifyOtp({ token_hash: tokenHash, type: otpType })
      stripCredentialsFromUrl()

      if (error && !(await hasActiveSession())) {
        const friendly = friendlyAuthError(error.message)
        fail('Não foi possível confirmar', friendly.message, friendly.hint)
        return
      }
    }
    // 3) PKCE code — the Supabase module usually exchanges it before we mount.
    else if (code) {
      status.value = 'Validando sessão...'
      if (!(await waitForSession(6))) {
        const { error } = await client.auth.exchangeCodeForSession(code)
        if (error && !(await waitForSession(4))) {
          stripCredentialsFromUrl()
          const friendly = friendlyAuthError(error.message)
          fail('Não foi possível confirmar', friendly.message, friendly.hint)
          return
        }
      }
      stripCredentialsFromUrl()
    }
    else {
      status.value = 'Carregando sessão...'
      await waitForSession(4)
    }

    if (!(await waitForSession(6))) {
      fail(
        'Não foi possível confirmar',
        'Este link é inválido ou já foi usado.',
        'Peça à agência para reenviar o convite e abra apenas o e-mail mais recente.',
      )
      return
    }

    await redirectByFlow(flow)
  }
  catch (error: any) {
    stripCredentialsFromUrl()
    const friendly = friendlyAuthError(error?.message || '')
    fail('Erro inesperado', friendly.message, friendly.hint)
  }
}

onMounted(() => {
  void resolve()
})
</script>

<template>
  <div class="flex items-center justify-center bg-muted/40 p-6 min-h-svh">
    <Card class="max-w-md w-full border-border/60 shadow-sm">
      <CardHeader class="items-center gap-2 text-center">
        <div
          class="size-11 flex items-center justify-center rounded-full"
          :class="{
            'bg-primary/10 text-primary': phase === 'loading',
            'bg-emerald-500/10 text-emerald-600': phase === 'success',
            'bg-destructive/10 text-destructive': phase === 'error',
          }"
        >
          <Loader2 v-if="phase === 'loading'" class="size-5 animate-spin" />
          <CheckCircle2 v-else-if="phase === 'success'" class="size-5" />
          <MailWarning v-else class="size-5" />
        </div>

        <CardTitle class="text-lg">
          {{ phase === 'error' ? errorTitle : status }}
        </CardTitle>
        <CardDescription>
          {{ phase === 'error' ? errorMessage : detail }}
        </CardDescription>
      </CardHeader>

      <CardContent v-if="phase === 'loading'" class="space-y-2">
        <Skeleton class="h-3 w-full" />
        <Skeleton class="h-3 w-4/5" />
        <Skeleton class="h-3 w-2/3" />
      </CardContent>

      <CardContent v-else-if="phase === 'error'">
        <Alert variant="destructive" class="border-destructive/30 bg-destructive/5">
          <AlertTitle class="text-sm">
            O que fazer agora
          </AlertTitle>
          <AlertDescription class="text-xs">
            {{ errorHint || 'Solicite um novo convite e abra o link mais recente.' }}
          </AlertDescription>
        </Alert>
      </CardContent>

      <CardFooter v-if="phase === 'error'" class="flex flex-col gap-2">
        <Button class="w-full" @click="navigateTo('/login')">
          <KeyRound class="mr-2 size-4" />
          Ir para o login
        </Button>
        <Button variant="ghost" class="w-full" @click="navigateTo('/forgot-password')">
          <RefreshCw class="mr-2 size-4" />
          Receber novo link por e-mail
        </Button>
      </CardFooter>
    </Card>
  </div>
</template>
