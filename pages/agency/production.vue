<script setup lang="ts">
/**
 * Agency consolidated production — reuses tenant Marketing production board
 * with organization filters already available in that page.
 */
definePageMeta({
  middleware: ['auth', 'organization'],
  requiredCapability: 'agency.clients.read',
  allowedOrganizationTypes: ['agency'],
  title: 'Produção geral',
})

await navigateTo('/marketing/production', { replace: true })
</script>

<template>
  <div class="p-6 text-sm text-muted-foreground">
    Redirecionando para produção…
  </div>
</template>
