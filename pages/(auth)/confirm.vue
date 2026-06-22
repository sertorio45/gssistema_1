<script setup lang="ts">
definePageMeta({
  layout: 'blank',
})

const user = useSupabaseUser()
const redirectTo = '/'

watch(user, () => {
  if (user.value) {
    return navigateTo(redirectTo)
  }
}, { immediate: true })
</script>

<template>
  <div class="flex min-h-svh items-center justify-center bg-muted p-6">
    <p class="text-sm text-muted-foreground">
      Confirmando autenticação...
    </p>
  </div>
</template>
