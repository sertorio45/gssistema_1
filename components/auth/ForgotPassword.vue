<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'

const email = ref('')
const errorMessage = ref('')
const successMessage = ref('')

const { resetPassword, loading, error } = useAuth()

watchEffect(() => {
  if (error.value) {
    errorMessage.value = error.value
  }
})

async function onSubmit(event: Event) {
  event.preventDefault()

  if (!email.value) {
    errorMessage.value = 'Informe seu e-mail'
    return
  }

  errorMessage.value = ''
  successMessage.value = ''

  const { success } = await resetPassword(email.value)

  if (success) {
    successMessage.value = 'Enviamos um link de recuperação para o seu e-mail. Verifique sua caixa de entrada.'
    email.value = ''
  }
}
</script>

<template>
  <form class="grid gap-6" @submit="onSubmit">
    <div v-if="errorMessage" class="border border-red-200 rounded bg-red-50 p-3 text-sm text-red-600">
      {{ errorMessage }}
    </div>

    <div v-if="successMessage" class="border border-green-200 rounded bg-green-50 p-3 text-sm text-green-700">
      {{ successMessage }}
    </div>

    <div class="grid gap-2">
      <Label for="email">E-mail</Label>
      <Input
        id="email"
        v-model="email"
        type="email"
        placeholder="seu@email.com"
        auto-capitalize="none"
        auto-complete="email"
        auto-correct="off"
        :disabled="loading"
      />
    </div>

    <Button type="submit" class="w-full" :disabled="loading">
      <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
      Enviar link de recuperação
    </Button>
  </form>
</template>
