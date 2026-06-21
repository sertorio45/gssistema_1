<script setup lang="ts">
definePageMeta({
  middleware: ['auth'],
})

await navigateTo('/whatsapp/dashboard', { replace: true })
</script>

<template>
  <div />
</template>
