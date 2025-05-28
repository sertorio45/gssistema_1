<template>
  <div>
    <pre>{{ relations }}</pre>
  </div>
</template>

<script lang="ts" setup>
import { useTenantStore } from '~/stores/tenant'

const tenantStore = useTenantStore()

const { data: relations } = await useFetch('/api/articles/tag/relations', {
  method: 'GET',
  query: {
    tenant_id: tenantStore.tenantId,
  },
})




</script>

<style>

</style>