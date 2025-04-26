<script setup lang="ts">
import SignIn from '~/components/auth/SignIn.vue'
import Auth from '~/components/layout/Auth.vue'
import { useAuth } from '~/composables/useAuth'

definePageMeta({
  layout: 'blank',
  middleware: ['guest'],
})

const router = useRouter()
const { currentUser, isAuthenticated } = useAuth()

// Verificar se o usuário já está autenticado ao carregar a página
onMounted(() => {
  if (isAuthenticated.value) {
    const redirectTo = localStorage.getItem('redirectTo') || '/'
    localStorage.removeItem('redirectTo')
    router.push(redirectTo)
  }
})
</script>

<template>
  <Auth reverse>
    <div class="grid mx-auto max-w-sm gap-6">
      <div class="grid gap-2 text-center">
        <h1 class="text-2xl font-semibold tracking-tight">
          Welcome back
        </h1>
        <p class="text-balance text-sm text-muted-foreground">
          Enter your credentials to login
        </p>
      </div>
      <SignIn />
    </div>
  </Auth>
</template>
