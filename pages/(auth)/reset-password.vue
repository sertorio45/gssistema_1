<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'

import Auth from '~/components/layout/Auth.vue'
import PasswordInput from '~/components/PasswordInput.vue'

definePageMeta({
  layout: 'blank',
})

const password = ref('')
const confirmPassword = ref('')
const errorMessage = ref('')
const successMessage = ref('')

const { updatePassword, loading, error } = useAuth()
const router = useRouter()

watchEffect(() => {
  if (error.value) {
    errorMessage.value = error.value
  }
})

async function onSubmit(event: Event) {
  event.preventDefault()

  if (!password.value || !confirmPassword.value) {
    errorMessage.value = 'Preencha todos os campos'
    return
  }

  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'As senhas não coincidem'
    return
  }

  if (password.value.length < 6) {
    errorMessage.value = 'A senha deve ter pelo menos 6 caracteres'
    return
  }

  errorMessage.value = ''
  successMessage.value = ''

  const { success } = await updatePassword(password.value)

  if (success) {
    successMessage.value = 'Senha atualizada com sucesso. Redirecionando para o login...'
    setTimeout(() => router.push('/login'), 2000)
  }
}
</script>

<template>
  <Auth reverse>
    <div class="grid mx-auto max-w-sm gap-6">
      <div class="grid gap-2 text-center">
        <h1 class="text-2xl font-semibold tracking-tight">
          Nova senha
        </h1>
        <p class="text-balance text-sm text-muted-foreground">
          Defina uma nova senha para sua conta
        </p>
      </div>

      <form class="grid gap-6" @submit="onSubmit">
        <div v-if="errorMessage" class="border border-red-200 rounded bg-red-50 p-3 text-sm text-red-600">
          {{ errorMessage }}
        </div>

        <div v-if="successMessage" class="border border-green-200 rounded bg-green-50 p-3 text-sm text-green-700">
          {{ successMessage }}
        </div>

        <div class="grid gap-2">
          <Label for="password">Nova senha</Label>
          <PasswordInput id="password" v-model="password" placeholder="Digite sua nova senha" :disabled="loading" />
        </div>

        <div class="grid gap-2">
          <Label for="confirm-password">Confirmar senha</Label>
          <PasswordInput id="confirm-password" v-model="confirmPassword" placeholder="Confirme sua nova senha" :disabled="loading" />
        </div>

        <Button type="submit" class="w-full" :disabled="loading">
          <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
          Salvar nova senha
        </Button>
      </form>

      <p class="text-center text-sm text-muted-foreground">
        <NuxtLink to="/login" class="underline underline-offset-4 hover:text-primary">
          Voltar ao login
        </NuxtLink>
      </p>
    </div>
  </Auth>
</template>
