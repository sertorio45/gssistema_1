<script setup lang="ts">
import ConfirmDeleteHost from '~/components/shared/ConfirmDeleteHost.vue'
</script>

<template>
  <div>
    <slot />
    <ConfirmDeleteHost />
  </div>
</template>

<style scoped></style>
