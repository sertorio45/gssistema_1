<script setup lang="ts">
definePageMeta({
  middleware: ['auth'],
})

await navigateTo('/settings/integrations/meta-capi', { replace: true })
</script>

<template>
  <div />
</template>
