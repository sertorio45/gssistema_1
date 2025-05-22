<script lang="ts" setup>
import { useSupabaseClient } from '#imports'
import { ref, watch } from 'vue'
import { useTenant } from '~/composables/useTenant'

const supabase = useSupabaseClient()
const data = ref<any[]>([])
const { tenantId } = useTenant()

watch(tenantId, async (newTenant) => {
  if (!newTenant) {
    data.value = []
    return
  }

  const { data: articles } = await supabase
    .from('articles')
    .select('tenant_id, title')
    .eq('tenant_id', newTenant)
  if (articles) data.value = articles
}, { immediate: true })
</script>

<template>
  <div>
    <div v-if="!tenantId">Selecione um tenant.</div>
    <div v-else>
      <div v-for="item in data" :key="item.tenant_id">
        tenant_id: {{ item.tenant_id }}<br>
        title: {{ item.title }}
      </div>
    </div>
  </div>
</template>

<style>

</style>