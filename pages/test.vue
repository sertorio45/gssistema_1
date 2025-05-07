<script lang="ts" setup>
import { useRole } from '@/composables/useRole'
import { onMounted } from 'vue'

const { userRole, fetchUserRole } = useRole()

onMounted(async () => {
  await fetchUserRole()
})
</script>

<template>
  <div>
    <p>User roles do JWT:</p>
    <pre>{{ userRole }}</pre>
  </div>
</template>

<style>

</style>