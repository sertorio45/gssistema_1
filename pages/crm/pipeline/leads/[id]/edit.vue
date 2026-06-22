<script setup lang="ts">
const route = useRoute()

definePageMeta({
  middleware: ['auth', 'tenant'],
})

await navigateTo(`/crm/funnel`, { replace: true })
</script>

<template>
  <div />
</template>
