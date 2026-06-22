<script setup lang="ts">
const route = useRoute()

definePageMeta({
  middleware: ['auth', 'tenant'],
})

const id = route.params.id as string
await navigateTo(`/crm/config/funnel/${id}/edit`, { replace: true })
</script>

<template>
  <div />
</template>
