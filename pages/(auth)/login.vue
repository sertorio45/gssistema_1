<script setup lang="ts">
import SignIn from '~/components/auth/SignIn.vue'
import Auth from '~/components/layout/Auth.vue'

definePageMeta({
  layout: 'blank',
  middleware: ['guest'],
})

useSeoMeta({
  title: 'Entrar',
  description: 'Acesse sua conta no Blimber - Hub de soluções.',
})

const router = useRouter()

// Verificar se o usuário já está autenticado ao carregar a página
// onMounted(() => {
//   if (isAuthenticated.value) {
//     const redirectTo = localStorage.getItem('redirectTo') || '/'
//     localStorage.removeItem('redirectTo')
//     router.push(redirectTo)
//   }
// })
</script>

<template>
  <Auth reverse>
    <div class="grid mx-auto max-w-sm gap-6">
      <div class="grid gap-2 text-center">
        <h1 class="text-2xl font-semibold tracking-tight">
          Seja bem-vindo de volta
        </h1>
        <p class="text-balance text-sm text-muted-foreground">
          Digite suas credenciais para entrar
        </p>
      </div>
      <SignIn />
    </div>
  </Auth>
</template>
