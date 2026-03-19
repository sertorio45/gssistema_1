<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

// CRM initial page is the dashboard
await navigateTo('/crm/dashboard', { replace: true })
</script>

<template>
  <div />
</template>
