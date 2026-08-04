<script setup lang="ts">
definePageMeta({
  middleware: ['auth'],
  title: 'Integrações',
})

await navigateTo('/settings/integrations', { redirectCode: 301 })
</script>

<template>
  <div />
</template>
