<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'

import Auth from '~/components/layout/Auth.vue'
import PasswordInput from '~/components/PasswordInput.vue'

definePageMeta({
  layout: 'blank',
})

useSeoMeta({
  title: 'Criar senha',
  description: 'Defina a senha da sua conta Blimber.',
})

const client = useSupabaseClient()
const user = useSupabaseUser()
const { updatePassword, loading, error } = useAuth()

const password = ref('')
const confirmPassword = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const checking = ref(true)
const hasSession = ref(false)

const isStrongEnough = computed(() =>
  password.value.length >= 8
  && /[a-z]/i.test(password.value)
  && /\d/.test(password.value),
)

onMounted(async () => {
  const { data } = await client.auth.getSession()
  hasSession.value = Boolean(data.session?.user || user.value)
  checking.value = false
  if (!hasSession.value)
    errorMessage.value = 'Sessão do convite não encontrada. Abra o link do e-mail novamente ou peça um novo convite.'
})

watchEffect(() => {
  if (error.value)
    errorMessage.value = error.value
})

async function onSubmit(event: Event) {
  event.preventDefault()

  if (!hasSession.value) {
    errorMessage.value = 'Sessão do convite expirada. Solicite um novo convite.'
    return
  }

  if (!password.value || !confirmPassword.value) {
    errorMessage.value = 'Preencha todos os campos'
    return
  }

  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'As senhas não coincidem'
    return
  }

  if (!isStrongEnough.value) {
    errorMessage.value = 'Use ao menos 8 caracteres, com letras e números'
    return
  }

  errorMessage.value = ''
  successMessage.value = ''

  // Keep session so the invited user enters the hub right after.
  const { success } = await updatePassword(password.value, { signOutAfter: false })

  if (success) {
    successMessage.value = 'Senha criada. Entrando no sistema...'
    await navigateTo('/', { replace: true })
  }
}
</script>

<template>
  <Auth reverse>
    <div class="grid mx-auto max-w-sm gap-6">
      <div class="grid gap-2 text-center">
        <h1 class="text-2xl font-semibold tracking-tight">
          Criar sua senha
        </h1>
        <p class="text-balance text-sm text-muted-foreground">
          Seu convite foi confirmado. Defina uma senha para acessar o Blimber.
        </p>
        <p v-if="user?.email" class="text-xs text-muted-foreground">
          Conta: <span class="text-foreground font-medium">{{ user.email }}</span>
        </p>
      </div>

      <div v-if="checking" class="flex justify-center py-8">
        <Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
      </div>

      <form v-else class="grid gap-6" @submit="onSubmit">
        <div v-if="errorMessage" class="border border-red-200 rounded bg-red-50 p-3 text-sm text-red-600">
          {{ errorMessage }}
        </div>

        <div v-if="successMessage" class="border border-green-200 rounded bg-green-50 p-3 text-sm text-green-700">
          {{ successMessage }}
        </div>

        <template v-if="hasSession">
          <div class="grid gap-2">
            <Label for="password">Senha</Label>
            <PasswordInput
              id="password"
              v-model="password"
              placeholder="Crie uma senha"
              :disabled="loading"
              autocomplete="new-password"
            />
            <p class="text-xs" :class="isStrongEnough ? 'text-emerald-600' : 'text-muted-foreground'">
              Mínimo de 8 caracteres, com letras e números.
            </p>
          </div>

          <div class="grid gap-2">
            <Label for="confirm-password">Confirmar senha</Label>
            <PasswordInput
              id="confirm-password"
              v-model="confirmPassword"
              placeholder="Repita a senha"
              :disabled="loading"
              autocomplete="new-password"
            />
          </div>

          <Button type="submit" class="w-full" :disabled="loading">
            <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
            Criar senha e entrar
          </Button>
        </template>

        <p v-else class="text-center text-sm text-muted-foreground">
          <NuxtLink to="/login" class="underline underline-offset-4 hover:text-primary">
            Ir para o login
          </NuxtLink>
        </p>
      </form>
    </div>
  </Auth>
</template>
