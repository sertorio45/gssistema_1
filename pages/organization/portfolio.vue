<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'organization'],
  requiredCapability: 'agency.clients.read',
  allowedOrganizationTypes: ['agency'],
})

await navigateTo('/organization/clients', { replace: true })
</script>

<template>
  <div />
</template>
