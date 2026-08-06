<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'organization'],
  requiredCapability: 'agency.clients.read',
  allowedOrganizationTypes: ['agency'],
})

await navigateTo('/agency/clients', { replace: true })
</script>

<template>
  <div />
</template>
