<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'tenant', 'role'],
  requiredRoles: ['admin', 'funcionario', 'cliente'],
})

useSeoMeta({
  title: 'Usuários - Configurações',
  description: 'Gerencie os usuários da sua empresa no CRM e WhatsApp.',
})
</script>

<template>
  <div class="mx-auto w-full max-w-5xl px-4 py-8">
    <TenantTeamManagementPanel />
  </div>
</template>
