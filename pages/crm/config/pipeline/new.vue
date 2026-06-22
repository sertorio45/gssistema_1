<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'tenant'],
})

await navigateTo('/crm/config/funnel/new', { replace: true })
</script>

<template>
  <div />
</template>
