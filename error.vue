<script setup lang="ts">
const { theme, radius } = useCustomize()
const error = useError()
const router = useRouter()

useHead({
  bodyAttrs: {
    class: computed(() => `theme-${theme.value}`),
    style: computed(() => `--radius: ${radius.value}rem;`),
  },
})

const statusCode = computed(() => error.value?.statusCode ?? 500)

const title = computed(() => {
  if (statusCode.value === 404)
    return 'Página não encontrada'
  if (statusCode.value === 403)
    return 'Acesso negado'
  return 'Algo deu errado'
})

const description = computed(() => {
  if (statusCode.value === 404) {
    return 'A página que você procura não existe ou foi removida.'
  }
  if (statusCode.value === 403) {
    return 'Você não tem permissão para acessar este recurso.'
  }
  return error.value?.message || 'Ocorreu um erro inesperado. Tente novamente em instantes.'
})

function goHome() {
  clearError({ redirect: '/' })
}

function goBack() {
  if (import.meta.client && window.history.length > 1) {
    router.back()
    return
  }
  goHome()
}
</script>

<template>
  <div class="h-svh">
    <div class="m-auto h-full w-full flex flex-col items-center justify-center gap-2 px-4">
      <h1 class="text-[7rem] font-bold leading-tight">
        {{ statusCode }}
      </h1>
      <span class="font-medium">{{ title }}</span>
      <p class="max-w-md text-center text-muted-foreground">
        {{ description }}
      </p>
      <div class="mt-6 flex gap-4">
        <Button variant="outline" @click="goBack">
          Voltar
        </Button>
        <Button @click="goHome">
          Ir para início
        </Button>
      </div>
    </div>
  </div>
</template>
