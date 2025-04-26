<script setup lang="ts">
definePageMeta({
  layout: 'blank',
})

const router = useRouter()

function goHome() {
  router.push('/')
}
</script>

<template>
  <div class="h-screen w-full flex flex-col items-center justify-center gap-4 p-4">
    <div class="flex flex-col items-center gap-2 text-center">
      <span class="text-6xl text-primary font-bold">403</span>
      <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">
        Acesso Negado
      </h1>
      <p class="max-w-lg text-balance text-muted-foreground">
        Você não tem permissão para acessar esta página. Por favor, entre com uma conta que tenha as permissões necessárias.
      </p>
    </div>
    <div class="flex gap-2">
      <Button variant="outline" @click="goHome">
        Voltar para a página inicial
      </Button>
      <Button as-child>
        <NuxtLink to="/login">
          Fazer login
        </NuxtLink>
      </Button>
    </div>
  </div>
</template>
