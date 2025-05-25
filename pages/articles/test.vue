<template>
  <div>
    {{ data }}
  </div>
</template>

<script lang="ts" setup>
const { data } = await useFetch('/api/articles/1')
console.log(data.value)
</script>

<style>

</style>