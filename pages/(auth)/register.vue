<script setup lang="ts">
import Auth from '~/components/layout/Auth.vue'

definePageMeta({
  layout: 'blank',
  middleware: ['guest'],
})
</script>

<template>
  <Auth reverse>
    <div class="grid mx-auto max-w-sm gap-6">
      <div class="flex flex-col text-center space-y-2">
        <h1 class="text-2xl font-semibold tracking-tight">
          Criar conta
        </h1>
        <p class="text-sm text-muted-foreground">
          Informe seus dados para criar sua conta
        </p>
      </div>
      <AuthSignUp />
      <p class="text-center text-sm text-muted-foreground">
        Já tem uma conta?
        <NuxtLink to="/login" class="underline underline-offset-4 hover:text-primary">
          Entrar
        </NuxtLink>
      </p>
    </div>
  </Auth>
</template>
