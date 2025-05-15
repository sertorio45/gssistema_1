<template>
  <div>
    <EcommerceProductProductList />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})
</script> 