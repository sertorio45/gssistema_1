<script setup lang="ts">
// SSR habilitado por padrão em Nuxt 3
const route = useRoute()
const _leadId = route.params.id
</script>

<template>
  <div>
    <h1 class="mb-4 text-2xl font-bold">
      Edit Pipeline Lead
    </h1>
    <!-- Pipeline Lead Edit Form Placeholder -->
    <form>
      <!-- Campos do formulário -->
    </form>
  </div>
</template>
