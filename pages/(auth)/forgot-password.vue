<script setup lang="ts">
import Auth from '~/components/layout/Auth.vue'

definePageMeta({
  layout: 'blank',
  middleware: ['guest'],
})

useSeoMeta({
  title: 'Recuperar senha',
})
</script>

<template>
  <Auth reverse>
    <div class="grid mx-auto max-w-sm gap-6">
      <div class="grid gap-2 text-center">
        <h1 class="text-2xl font-semibold tracking-tight">
          Recuperar senha
        </h1>
        <p class="text-balance text-sm text-muted-foreground">
          Informe seu e-mail para receber o link de redefinição
        </p>
      </div>
      <AuthForgotPassword />
      <p class="text-center text-sm text-muted-foreground">
        Lembrou sua senha?
        <NuxtLink to="/login" class="underline underline-offset-4 hover:text-primary">
          Voltar ao login
        </NuxtLink>
      </p>
    </div>
  </Auth>
</template>
