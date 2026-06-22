<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'tenant'],
})

await navigateTo('/settings/team', { replace: true })
</script>
