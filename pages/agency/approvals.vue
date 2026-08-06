<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'organization'],
  requiredCapability: 'agency.clients.read',
  allowedOrganizationTypes: ['agency'],
  title: 'Aprovações pendentes',
})

await navigateTo('/marketing/approvals', { replace: true })
</script>

<template>
  <div class="p-6 text-sm text-muted-foreground">
    Redirecionando para aprovações…
  </div>
</template>
