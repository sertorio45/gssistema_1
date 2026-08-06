<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'organization'],
  requiredCapability: 'agency.clients.read',
  allowedOrganizationTypes: ['agency'],
  title: 'Calendário consolidado',
})

await navigateTo('/marketing/calendar', { replace: true })
</script>

<template>
  <div class="p-6 text-sm text-muted-foreground">
    Redirecionando para o calendário…
  </div>
</template>
