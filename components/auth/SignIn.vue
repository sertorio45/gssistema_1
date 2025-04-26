<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'
import PasswordInput from '~/components/PasswordInput.vue'

const email = ref('')
const password = ref('')
const errorMessage = ref('')

const { login, loading, error } = useAuth()
const router = useRouter()

// Observar erros de autenticação
watchEffect(() => {
  if (error.value) {
    errorMessage.value = error.value
  }
})

async function onSubmit(event: Event) {
  event.preventDefault()

  // Validação básica
  if (!email.value || !password.value) {
    errorMessage.value = 'Email and password are required'
    return
  }

  errorMessage.value = ''

  const { success } = await login(email.value, password.value)

  if (success) {
    router.push('/')
  }
}
</script>

<template>
  <form class="grid gap-6" @submit="onSubmit">
    <div v-if="errorMessage" class="mb-2 border border-red-200 rounded bg-red-50 p-3 text-sm text-red-600">
      {{ errorMessage }}
    </div>

    <div class="grid gap-2">
      <Label for="email">
        Email
      </Label>
      <Input
        id="email"
        v-model="email"
        type="email"
        placeholder="name@example.com"
        :disabled="loading"
        auto-capitalize="none"
        auto-complete="email"
        auto-correct="off"
      />
    </div>
    <div class="grid gap-2">
      <div class="flex items-center">
        <Label for="password">
          Password
        </Label>
        <NuxtLink
          to="/forgot-password"
          class="ml-auto inline-block text-sm underline"
        >
          Forgot your password?
        </NuxtLink>
      </div>
      <PasswordInput id="password" v-model="password" />
    </div>
    <Button type="submit" class="w-full" :disabled="loading">
      <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
      Login
    </Button>
  </form>
  <div class="mt-4 text-center text-sm text-muted-foreground">
    Don't have an account?
    <NuxtLink to="/register" class="underline">
      Sign up
    </NuxtLink>
  </div>
</template>

<style scoped>

</style>
