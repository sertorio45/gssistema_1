<script setup lang="ts">
definePageMeta({
  middleware: ['auth'],
})

const route = useRoute()

await navigateTo({
  path: '/whatsapp/conversations',
  query: { id: route.params.id as string },
}, { replace: true })
</script>

<template>
  <div />
</template>
