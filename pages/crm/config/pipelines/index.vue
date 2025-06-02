<script setup lang="ts">
import type { ColumnDef } from '@tanstack/vue-table'
import DataTable from '@/components/ui/table/DataTable.vue'
// TODO: Substituir por fetch real quando API de pipelines estiver pronta
const pipelines = [
  { name: 'Default Pipeline', description: 'Main sales pipeline', stages: 5 },
  { name: 'Enterprise', description: 'Pipeline for enterprise deals', stages: 7 },
]
const columns: ColumnDef<any>[] = [
  {
    accessorKey: 'name',
    header: 'Pipeline Name',
  },
  {
    accessorKey: 'description',
    header: 'Description',
  },
  {
    accessorKey: 'stages',
    header: 'Stages',
  },
]
</script>

<template>
  <div class="min-h-[60vh] flex flex-col items-center justify-center py-10">
    <h1 class="text-2xl font-bold mb-2 text-center">Pipelines</h1>
    <p class="text-muted-foreground mb-8 text-center max-w-xl">Create and manage sales pipelines to organize your leads and deals by workflow.</p>
    <div class="w-full max-w-4xl">
      <DataTable :columns="columns" :data="pipelines" />
    </div>
  </div>
</template> 