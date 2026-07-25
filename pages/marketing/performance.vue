<script setup lang="ts">
definePageMeta({
  middleware: ['auth'],
  title: 'Relatórios de Marketing',
})

await navigateTo('/marketing/reports', { redirectCode: 301 })
</script>

<template>
  <div class="p-6 text-sm text-muted-foreground">
    Abrindo relatórios de Marketing...
  </div>
</template>
