<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'tenant'],
})

await navigateTo('/crm/funnel', { replace: true })
</script>

<template>
  <div />
</template>
