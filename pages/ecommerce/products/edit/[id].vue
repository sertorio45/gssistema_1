<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const route = useRoute()
</script>

<template>
  <div>
    <EcommerceProductProductForm :id="route.params.id" />
  </div>
</template> 