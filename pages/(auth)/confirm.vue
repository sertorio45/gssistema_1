<script setup lang="ts">
/**
 * Auth callback landing.
 * inviteUserByEmail → redirectTo=/confirm?flow=invite → /invite (create password)
 * recovery links → /reset-password
 * other sessions → /
 */
definePageMeta({
  layout: 'blank',
})

const route = useRoute()
const user = useSupabaseUser()
const client = useSupabaseClient()

const status = ref('Confirmando autenticação...')
const errorMessage = ref('')

function readHashType(): string | null {
  if (!import.meta.client || !window.location.hash)
    return null
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  return params.get('type')
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

async function waitForSession(attempts = 8): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    if (user.value)
      return true
    const { data } = await client.auth.getSession()
    if (data.session?.user)
      return true
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  return Boolean(user.value)
}

async function resolve() {
  try {
    // PKCE: @nuxtjs/supabase may already exchange ?code= — only do it if needed.
    const existing = await client.auth.getSession()
    if (!existing.data.session && route.query.code) {
      status.value = 'Validando convite...'
      const { error } = await client.auth.exchangeCodeForSession(String(route.query.code))
      if (error)
        console.warn('[confirm] exchangeCodeForSession', error.message)
    }

    const hasSession = await waitForSession()

    if (!hasSession) {
      errorMessage.value = 'Este link é inválido ou já expirou. Solicite um novo convite ou faça login.'
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
    errorMessage.value = error?.message || 'Falha ao confirmar autenticação'
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
    <NuxtLink
      v-if="errorMessage"
      to="/login"
      class="text-sm font-medium underline underline-offset-4"
    >
      Ir para o login
    </NuxtLink>
  </div>
</template>
